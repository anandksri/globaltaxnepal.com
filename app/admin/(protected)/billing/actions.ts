"use server";

import { BillStatus, PaymentMethod, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  billInputSchema,
  calculateBill,
  formatCents,
  moneyToCents,
  parseBillFormData,
  type BillInput,
} from "@/lib/admin/billing";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export type BillingActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function getFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function getMoneyData(parsed: ReturnType<typeof calculateBill>) {
  return {
    subtotal: new Prisma.Decimal(formatCents(parsed.subtotal)),
    discount: new Prisma.Decimal(formatCents(parsed.discount)),
    taxableAmount: new Prisma.Decimal(formatCents(parsed.taxableAmount)),
    vatRate: new Prisma.Decimal(formatCents(parsed.vatRate)),
    vatAmount: new Prisma.Decimal(formatCents(parsed.vatAmount)),
    totalAmount: new Prisma.Decimal(formatCents(parsed.totalAmount)),
  };
}

function getItemData(
  input: BillInput,
  amounts: ReturnType<typeof calculateBill>["itemAmounts"],
) {
  return input.items.map((item, index) => ({
    description: item.description.trim(),
    quantity: new Prisma.Decimal(item.quantity),
    unit: item.unit.trim(),
    rate: new Prisma.Decimal(item.rate),
    amount: new Prisma.Decimal(amounts[index].amountDecimal),
    position: index,
  }));
}

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function getBillSnapshot(transaction: Prisma.TransactionClient, clientId: string) {
  const client = await transaction.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      displayName: true,
      contactPerson: true,
      email: true,
      phone: true,
      province: true,
      district: true,
      municipality: true,
      wardNumber: true,
      streetAddress: true,
      address: true,
      panNumber: true,
      vatRegistered: true,
      vatNumber: true,
      isActive: true,
    },
  });
  return client;
}

function buildAddress(client: NonNullable<Awaited<ReturnType<typeof getBillSnapshot>>>) {
  return [
    client.streetAddress || client.address,
    client.wardNumber ? `Ward ${client.wardNumber}` : null,
    client.municipality,
    client.district,
    client.province,
  ].filter(Boolean).join(", ");
}

async function buildBillData(
  transaction: Prisma.TransactionClient,
  clientId: string,
  parsed: Exclude<ReturnType<typeof parseBillFormData>, { success: false }>["data"],
  createdById: string,
  status: BillStatus,
  allowedInactiveClientId?: string,
) {
  const client = await getBillSnapshot(transaction, clientId);
  if (!client || (!client.isActive && client.id !== allowedInactiveClientId)) {
    throw new Error("BILL_CLIENT_UNAVAILABLE");
  }
  if (parsed.vatApplied && !client.vatRegistered) throw new Error("BILL_VAT_CLIENT_NOT_REGISTERED");

  let totals: ReturnType<typeof calculateBill>;
  try {
    totals = calculateBill(parsed);
  } catch (error) {
    if (error instanceof RangeError) throw new Error("BILL_DISCOUNT_EXCEEDS_SUBTOTAL");
    throw error;
  }

  const maxCents = 99_999_999_999_999n;
  if (
    totals.totalAmount > maxCents ||
    totals.subtotal > maxCents ||
    totals.itemAmounts.some((item) => item.amount > maxCents)
  ) {
    throw new Error("BILL_AMOUNT_TOO_LARGE");
  }

  const settings = await transaction.companySettings.findUnique({
    where: { id: "company" },
    select: { currencyCode: true },
  });
  const date = toUtcDate(parsed.billDate);
  return {
    client,
    totals,
    date,
    data: {
      clientId: client.id,
      clientName: client.displayName,
      contactPerson: client.contactPerson,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: buildAddress(client),
      clientPanNumber: client.panNumber,
      clientVatNumber: client.vatNumber,
      billDate: date,
      dueDate: parsed.dueDate ? toUtcDate(parsed.dueDate) : null,
      status,
      currencyCode: settings?.currencyCode ?? "NPR",
      ...getMoneyData(totals),
      vatApplied: parsed.vatApplied,
      notes: parsed.notes || null,
      createdById,
    },
    items: getItemData(parsed, totals.itemAmounts),
  };
}

async function nextBillNumber(transaction: Prisma.TransactionClient, billDate: Date) {
  const sequence = await transaction.billNumberSequence.upsert({
    where: { year: billDate.getUTCFullYear() },
    create: { year: billDate.getUTCFullYear(), currentValue: 1 },
    update: { currentValue: { increment: 1 } },
    select: { currentValue: true },
  });
  const settings = await transaction.companySettings.findUnique({
    where: { id: "company" },
    select: { invoicePrefix: true },
  });
  const prefix = settings?.invoicePrefix?.trim() || "GTN";
  return `${prefix}-${billDate.getUTCFullYear()}-${sequence.currentValue.toString().padStart(6, "0")}`;
}

function getInputState(formData: FormData) {
  const parsed = parseBillFormData(formData);
  if (!parsed.success) {
    return {
      error: "Review the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsed.error.issues),
    } satisfies BillingActionState;
  }

  try {
    const totals = calculateBill(parsed.data);
    if (totals.totalAmount > 99_999_999_999_999n) {
      return { error: "Bill total exceeds the supported amount." } satisfies BillingActionState;
    }
  } catch (error) {
    if (error instanceof RangeError) {
      return {
        error: "Discount cannot exceed the subtotal.",
        fieldErrors: { discount: "Discount cannot exceed the subtotal." },
      } satisfies BillingActionState;
    }
    throw error;
  }
  return { data: parsed.data };
}

export async function createBill(
  _previousState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("BILLING", "CREATE");
  const input = getInputState(formData);
  if (!input.data) return input;
  const intent = formData.get("intent") === "issue" ? "ISSUED" : "DRAFT";
  let billId: string;

  try {
    const bill = await prisma.$transaction(async (transaction) => {
      const prepared = await buildBillData(
        transaction,
        input.data.clientId,
        input.data,
        admin.id,
        intent,
      );
      const billNumber = await nextBillNumber(transaction, prepared.date);
      const created = await transaction.bill.create({
        data: {
          ...prepared.data,
          billNumber,
          issuedAt: intent === "ISSUED" ? new Date() : null,
          items: { create: prepared.items },
        },
        select: { id: true, billNumber: true },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: intent === "ISSUED" ? "BILL_ISSUED" : "BILL_DRAFT_CREATED",
          targetType: "Bill",
          targetId: created.id,
          metadata: { billNumber: created.billNumber, totalAmount: prepared.totals.totalAmount.toString() },
        },
      });
      return created;
    });
    billId = bill.id;
  } catch (error) {
    const knownError = billingErrorResponse(error);
    if (knownError) return knownError;
    console.error("[admin-billing] Bill creation failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The bill could not be saved. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/billing");
  redirect(`/admin/billing/${billId}`);
}

export async function updateDraftBill(
  billId: string,
  _previousState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("BILLING", "EDIT");
  const validId = z.string().min(1).max(191).safeParse(billId);
  if (!validId.success) return { error: "This bill could not be found." };
  const input = getInputState(formData);
  if (!input.data) return input;
  const intent = formData.get("intent") === "issue";

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.bill.findUnique({
        where: { id: validId.data },
        select: { status: true, billType: true, clientId: true, billNumber: true },
      });
      if (!current) return "missing" as const;
      if (current.billType !== "NORMAL") return "missing" as const;
      if (current.status !== BillStatus.DRAFT) return "locked" as const;

      const prepared = await buildBillData(
        transaction,
        input.data.clientId,
        input.data,
        admin.id,
        intent ? BillStatus.ISSUED : BillStatus.DRAFT,
        current.clientId,
      );
      const { createdById: originalCreator, ...updateData } = prepared.data;
      void originalCreator;
      await transaction.bill.update({
        where: { id: validId.data },
        data: {
          ...updateData,
          issuedAt: intent ? new Date() : null,
          items: { deleteMany: {}, create: prepared.items },
        },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: intent ? "BILL_ISSUED" : "BILL_DRAFT_UPDATED",
          targetType: "Bill",
          targetId: validId.data,
          metadata: { billNumber: current.billNumber, totalAmount: prepared.totals.totalAmount.toString() },
        },
      });
      return "updated" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result === "missing") return { error: "This bill could not be found." };
    if (result === "locked") return { error: "Only draft bills can be edited." };
  } catch (error) {
    const knownError = billingErrorResponse(error);
    if (knownError) return knownError;
    console.error("[admin-billing] Draft update failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The draft could not be updated. Please try again." };
  }

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/billing/${validId.data}`);
  redirect(`/admin/billing/${validId.data}`);
}

export async function recordPayment(
  billId: string,
  _previousState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("BILLING", "EDIT");
  const validId = z.string().min(1).max(191).safeParse(billId);
  if (!validId.success) return { error: "This bill could not be found." };
  const parsed = z.object({
    paymentDate: z.string().refine((value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }),
    method: z.nativeEnum(PaymentMethod),
    amount: z.string().trim().regex(/^\d{1,12}(?:\.\d{1,2})?$/),
    reference: z.string().trim().max(100),
    notes: z.string().trim().max(1000),
  }).safeParse({
    paymentDate: formData.get("paymentDate"),
    method: formData.get("method"),
    amount: formData.get("amount"),
    reference: formData.get("reference") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return {
      error: "Enter a valid payment date, method, and amount.",
      fieldErrors: getFieldErrors(parsed.error.issues),
    };
  }

  const amount = moneyToCents(parsed.data.amount);
  if (amount <= 0n) return { error: "Payment amount must be greater than zero." };

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const bill = await transaction.bill.findUnique({
        where: { id: validId.data, billType: "NORMAL" },
        include: { payments: { select: { amount: true } } },
      });
      if (!bill) return "missing" as const;
      if (bill.status !== BillStatus.ISSUED && bill.status !== BillStatus.PARTIALLY_PAID) {
        return "unavailable" as const;
      }
      const paid = bill.payments.reduce(
        (total, payment) => total.add(payment.amount),
        new Prisma.Decimal(0),
      );
      const outstanding = bill.totalAmount.sub(paid);
      const paymentDecimal = new Prisma.Decimal(parsed.data.amount);
      if (paymentDecimal.greaterThan(outstanding)) return "exceeds" as const;
      const payment = await transaction.payment.create({
        data: {
          billId: bill.id,
          receivedById: admin.id,
          paymentDate: toUtcDate(parsed.data.paymentDate),
          method: parsed.data.method,
          amount: paymentDecimal,
          reference: parsed.data.reference || null,
          notes: parsed.data.notes || null,
        },
      });
      const updatedPaid = paid.add(paymentDecimal);
      const status = updatedPaid.greaterThanOrEqualTo(bill.totalAmount)
        ? BillStatus.PAID
        : BillStatus.PARTIALLY_PAID;
      await transaction.bill.update({ where: { id: bill.id }, data: { status } });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "BILL_PAYMENT_RECORDED",
          targetType: "Bill",
          targetId: bill.id,
          metadata: {
            paymentId: payment.id,
            amount: paymentDecimal.toFixed(2),
            status,
          },
        },
      });
      return "recorded" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result === "missing") return { error: "This bill could not be found." };
    if (result === "unavailable") return { error: "Payments can only be recorded against issued bills with a balance." };
    if (result === "exceeds") return { error: "Payment cannot exceed the bill's outstanding balance." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { error: "Another payment or bill update occurred. Refresh the bill and try again." };
    }
    console.error("[admin-billing] Payment recording failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The payment could not be recorded. Please try again." };
  }

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/billing/${validId.data}`);
  redirect(`/admin/billing/${validId.data}`);
}

export async function cancelBill(
  billId: string,
  _previousState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("BILLING", "DELETE");
  const validId = z.string().min(1).max(191).safeParse(billId);
  if (!validId.success) return { error: "This bill could not be found." };
  const reason = z.string().trim().min(5, "Provide a cancellation reason.").max(500).safeParse(formData.get("reason"));
  if (!reason.success) {
    return { error: "Provide a cancellation reason of 5 to 500 characters." };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const bill = await transaction.bill.findUnique({
        where: { id: validId.data, billType: "NORMAL" },
        include: { payments: { select: { id: true } } },
      });
      if (!bill) return "missing" as const;
      if (
        bill.payments.length > 0 ||
        bill.status === BillStatus.PAID ||
        bill.status === BillStatus.PARTIALLY_PAID
      ) return "has-payments" as const;
      if (bill.status === BillStatus.CANCELLED) return "cancelled" as const;
      await transaction.bill.update({
        where: { id: bill.id },
        data: {
          status: BillStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason.data,
        },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "BILL_CANCELLED",
          targetType: "Bill",
          targetId: bill.id,
          metadata: { billNumber: bill.billNumber, reason: reason.data },
        },
      });
      return "cancelled" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result === "missing") return { error: "This bill could not be found." };
    if (result === "has-payments") return { error: "A bill with recorded payments cannot be cancelled." };
    if (result === "cancelled") return { error: "This bill is already cancelled." };
  } catch (error) {
    console.error("[admin-billing] Bill cancellation failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The bill could not be cancelled. Please try again." };
  }

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/billing/${validId.data}`);
  redirect(`/admin/billing/${validId.data}`);
}

function billingErrorResponse(error: unknown): BillingActionState | null {
  if (error instanceof Error) {
    if (error.message === "BILL_CLIENT_UNAVAILABLE") return { error: "Select an active client." };
    if (error.message === "BILL_VAT_CLIENT_NOT_REGISTERED") return { error: "VAT can only be applied when the selected client is VAT-registered." };
    if (error.message === "BILL_DISCOUNT_EXCEEDS_SUBTOTAL") return { error: "Discount cannot exceed the subtotal." };
    if (error.message === "BILL_AMOUNT_TOO_LARGE") return { error: "Bill contains an amount larger than the supported limit." };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { error: "A bill number conflict occurred. Please try again." };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return { error: "This bill could not be found." };
  }
  return null;
}
