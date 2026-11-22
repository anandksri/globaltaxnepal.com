"use server";

import { BillStatus, BillType, PaymentMethod, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { calculateBill, formatCents, parseBillFormData, type BillInput } from "@/lib/admin/billing";
import type { BillingActionState } from "@/app/admin/(protected)/billing/actions";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { encryptSensitiveText } from "@/lib/admin/sensitive-data";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function parseInput(formData: FormData) {
  const parsed = parseBillFormData(formData);
  if (!parsed.success) {
    return {
      error: "Review the highlighted fields and try again.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }
  try {
    calculateBill(parsed.data);
  } catch (error) {
    if (error instanceof RangeError) {
      return { error: "Discount cannot exceed the subtotal.", fieldErrors: { discount: "Discount cannot exceed the subtotal." } };
    }
    throw error;
  }
  return { data: parsed.data };
}

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function prepareDetailsBill(
  transaction: Prisma.TransactionClient,
  input: BillInput,
  adminId: string,
  allowedInactiveClientId?: string,
) {
  let client = await transaction.client.findUnique({
    where: { id: input.clientId },
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
  if (input.customerMode === "manual") {
    client = await transaction.client.create({
      data: {
        type: input.manualPan ? "BUSINESS" : "INDIVIDUAL",
        displayName: input.manualName,
        contactPerson: input.manualCompanyName || null,
        phone: input.manualContact || null,
        panNumber: input.manualPan || null,
        streetAddress: input.manualAddress || null,
        isActive: true,
      },
    });
  }
  if (!client || (!client.isActive && client.id !== allowedInactiveClientId)) {
    throw new Error("DETAILS_CLIENT_UNAVAILABLE");
  }
  if (input.vatApplied && !client.vatRegistered) throw new Error("DETAILS_VAT_CLIENT_NOT_REGISTERED");

  const totals = calculateBill(input);
  const limit = 99_999_999_999_999n;
  if (totals.totalAmount > limit || totals.itemAmounts.some((item) => item.amount > limit)) {
    throw new Error("DETAILS_AMOUNT_TOO_LARGE");
  }
  const [settings, billDate] = await Promise.all([
    transaction.companySettings.findUnique({ where: { id: "company" }, select: { currencyCode: true } }),
    Promise.resolve(utcDate(input.billDate)),
  ]);
  const address = [
    client.streetAddress || client.address,
    client.wardNumber ? `Ward ${client.wardNumber}` : null,
    client.municipality,
    client.district,
    client.province,
  ].filter(Boolean).join(", ");
  return {
    client,
    totals,
    billDate,
    data: {
      billType: BillType.DETAILS,
      clientId: client.id,
      clientName: client.displayName,
      contactPerson: client.contactPerson,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: address,
      clientPanNumber: client.panNumber,
      clientVatNumber: client.vatNumber,
      billDate,
      dueDate: input.dueDate ? utcDate(input.dueDate) : null,
      currencyCode: settings?.currencyCode ?? "NPR",
      subtotal: new Prisma.Decimal(formatCents(totals.subtotal)),
      discount: new Prisma.Decimal(formatCents(totals.discount)),
      taxableAmount: new Prisma.Decimal(formatCents(totals.taxableAmount)),
      vatApplied: input.vatApplied,
      vatRate: new Prisma.Decimal(formatCents(totals.vatRate)),
      vatAmount: new Prisma.Decimal(formatCents(totals.vatAmount)),
      totalAmount: new Prisma.Decimal(formatCents(totals.totalAmount)),
      notes: input.notes || null,
      createdById: adminId,
    },
    items: input.items.map((item, index) => ({
      description: item.description.trim(),
      quantity: new Prisma.Decimal(item.quantity),
      unit: item.unit.trim(),
      rate: new Prisma.Decimal(item.rate),
      amount: new Prisma.Decimal(totals.itemAmounts[index].amountDecimal),
      position: index,
    })),
  };
}

async function nextDetailsBillNumber(transaction: Prisma.TransactionClient, billDate: Date) {
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
  return `${settings?.invoicePrefix?.trim() || "GTN"}-D-${billDate.getUTCFullYear()}-${sequence.currentValue.toString().padStart(6, "0")}`;
}

function responseForError(error: unknown): BillingActionState | null {
  if (error instanceof Error) {
    if (error.message === "DETAILS_CLIENT_UNAVAILABLE") return { error: "Select an active client." };
    if (error.message === "DETAILS_VAT_CLIENT_NOT_REGISTERED") return { error: "VAT is only available for VAT-registered clients." };
    if (error.message === "DETAILS_AMOUNT_TOO_LARGE") return { error: "The bill amount exceeds the supported limit." };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { error: "A bill number conflict occurred. Please try again." };
  }
  return null;
}

export async function createDetailsBill(
  _previousState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("BILLING", "CREATE");
  const input = parseInput(formData);
  if (!input.data) return input;
  const paymentStatus = formData.get("paymentStatus") === "PAID" ? "PAID" : "PENDING";
  const status = paymentStatus === "PAID" ? BillStatus.PAID : BillStatus.DRAFT;
  const workDescription = (formData.get("workDescription") ?? "").toString().trim();
  const accountPassword = encryptSensitiveText((formData.get("accountPassword") ?? "").toString());
  try {
    const bill = await prisma.$transaction(async (transaction) => {
      const prepared = await prepareDetailsBill(transaction, input.data, admin.id);
      const customBillNumber = input.data.customBillNumber;
      const billNumber = customBillNumber
        ? customBillNumber
        : await nextDetailsBillNumber(transaction, prepared.billDate);
      const created = await transaction.bill.create({
        data: {
          ...prepared.data,
          workDescription: workDescription || null,
          accountPassword,
          paymentStatus,
          billNumber,
          status,
          issuedAt: status === BillStatus.PAID ? new Date() : null,
          items: { create: prepared.items },
        },
        select: { id: true, billNumber: true },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: status === BillStatus.PAID ? "DETAILS_BILL_PAID" : "DETAILS_BILL_DRAFT_CREATED",
          targetType: "Bill",
          targetId: created.id,
          metadata: { billNumber: created.billNumber, totalAmount: prepared.totals.totalAmount.toString() },
        },
      });
      return created;
    });
    revalidatePath("/admin/details-bills");
    redirect(`/admin/details-bills/${bill.id}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    const expected = responseForError(error);
    if (expected) return expected;
    console.error("[admin-details-bills] Creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The bill could not be saved. Please try again." };
  }
}

export async function updateDetailsBill(
  billId: string,
  _previousState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("BILLING", "EDIT");
  const id = z.string().min(1).max(191).safeParse(billId);
  if (!id.success) return { error: "This bill could not be found." };
  const input = parseInput(formData);
  if (!input.data) return input;
  const paymentStatus = formData.get("paymentStatus") === "PAID" ? "PAID" : "PENDING";
  const issue = paymentStatus === "PAID";
  const workDescription = (formData.get("workDescription") ?? "").toString().trim();
  const accountPassword = encryptSensitiveText((formData.get("accountPassword") ?? "").toString());
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.bill.findUnique({
        where: { id: id.data, billType: BillType.DETAILS },
        select: { status: true, clientId: true, billNumber: true },
      });
      if (!current) return "missing" as const;
      if (current.status !== BillStatus.DRAFT) return "locked" as const;
      const prepared = await prepareDetailsBill(transaction, input.data, admin.id, current.clientId);
      const { billType: _billType, createdById: _creator, ...changes } = prepared.data;
      await transaction.bill.update({
        where: { id: id.data },
        data: {
          ...changes,
          billNumber: input.data.customBillNumber || current.billNumber,
          workDescription: workDescription || null,
          accountPassword,
          paymentStatus,
          status: issue ? BillStatus.PAID : BillStatus.DRAFT,
          issuedAt: issue ? new Date() : null,
          items: { deleteMany: {}, create: prepared.items },
        },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: issue ? "DETAILS_BILL_ISSUED" : "DETAILS_BILL_DRAFT_UPDATED",
          targetType: "Bill",
          targetId: id.data,
          metadata: { billNumber: current.billNumber, totalAmount: prepared.totals.totalAmount.toString() },
        },
      });
      return "updated" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result === "missing") return { error: "This bill could not be found." };
    if (result === "locked") return { error: "Only draft details bills can be edited." };
    revalidatePath("/admin/details-bills");
    redirect(`/admin/details-bills/${id.data}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    const expected = responseForError(error);
    if (expected) return expected;
    console.error("[admin-details-bills] Update failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The draft could not be updated. Please try again." };
  }
}

const paymentSchema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(100),
});

export async function markDetailsBillPaid(
  billId: string,
  _previousState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("BILLING", "EDIT");
  const id = z.string().min(1).max(191).safeParse(billId);
  const payment = paymentSchema.safeParse({
    paymentDate: formData.get("paymentDate"),
    method: formData.get("method"),
    reference: formData.get("reference") ?? "",
  });
  if (!id.success) return { error: "This bill could not be found." };
  if (!payment.success) return { error: "Enter a valid payment date and method." };
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const bill = await transaction.bill.findUnique({
        where: { id: id.data, billType: BillType.DETAILS },
        include: { payments: { select: { amount: true } } },
      });
      if (!bill) return "missing" as const;
      if (bill.status !== BillStatus.ISSUED && bill.status !== BillStatus.PARTIALLY_PAID) return "unavailable" as const;
      const paid = bill.payments.reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
      const balance = bill.totalAmount.sub(paid);
      if (balance.lessThanOrEqualTo(0)) return "paid" as const;
      const date = new Date(`${payment.data.paymentDate}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== payment.data.paymentDate) return "invalid-date" as const;
      const record = await transaction.payment.create({
        data: {
          billId: bill.id,
          receivedById: admin.id,
          paymentDate: date,
          method: payment.data.method,
          amount: balance,
          reference: payment.data.reference || null,
        },
      });
      await transaction.bill.update({ where: { id: bill.id }, data: { status: BillStatus.PAID } });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "DETAILS_BILL_PAID",
          targetType: "Bill",
          targetId: bill.id,
          metadata: { paymentId: record.id, amount: balance.toFixed(2) },
        },
      });
      return "paid" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result === "missing") return { error: "This bill could not be found." };
    if (result === "unavailable") return { error: "Only an issued details bill with a balance can be marked paid." };
    if (result === "invalid-date") return { error: "Enter a valid payment date." };
    if (result === "paid") {
      revalidatePath(`/admin/details-bills/${id.data}`);
      redirect(`/admin/details-bills/${id.data}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[admin-details-bills] Payment recording failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The bill payment could not be recorded. Please try again." };
  }
  revalidatePath("/admin/details-bills");
  redirect(`/admin/details-bills/${id.data}`);
}

export async function cancelDetailsBill(
  billId: string,
  _previousState: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("BILLING", "DELETE");
  const id = z.string().min(1).max(191).safeParse(billId);
  const reason = z.string().trim().min(5).max(500).safeParse(formData.get("reason"));
  if (!id.success) return { error: "This bill could not be found." };
  if (!reason.success) return { error: "Provide a cancellation reason of 5 to 500 characters." };
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const bill = await transaction.bill.findUnique({
        where: { id: id.data, billType: BillType.DETAILS },
        include: { payments: { select: { id: true } } },
      });
      if (!bill) return "missing" as const;
      if (bill.payments.length || bill.status === BillStatus.PAID || bill.status === BillStatus.PARTIALLY_PAID) return "has-payments" as const;
      if (bill.status === BillStatus.CANCELLED) return "cancelled" as const;
      await transaction.bill.update({
        where: { id: bill.id },
        data: { status: BillStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason.data },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "DETAILS_BILL_CANCELLED",
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
    console.error("[admin-details-bills] Cancellation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The bill could not be cancelled. Please try again." };
  }
  revalidatePath("/admin/details-bills");
  redirect(`/admin/details-bills/${id.data}`);
}
