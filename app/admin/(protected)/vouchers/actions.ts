"use server";

import { PaymentMethod, Prisma, VoucherType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { BillingActionState } from "@/app/admin/(protected)/billing/actions";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const commonSchema = z.object({
  voucherDate: z.string().refine(validDate, "Enter a valid voucher date."),
  amount: z.string().trim().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Enter a valid amount."),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(100),
});

const receiptSchema = commonSchema.extend({
  clientId: z.string().trim().min(1, "Select a client."),
  customVoucherNumber: z.string().trim().max(40),
  description: z.string().trim().max(1000),
});

const paymentSchema = commonSchema.extend({
  payeeName: z.string().trim().min(1, "Enter the payee name.").max(200),
  purpose: z.string().trim().min(1, "Enter the payment purpose.").max(1000),
});

function actionError(issues: { path: PropertyKey[]; message: string }[]): BillingActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: "Review the highlighted fields and try again.", fieldErrors };
}

function readForm(formData: FormData) {
  return {
    voucherDate: formData.get("voucherDate"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: formData.get("reference") ?? "",
    customVoucherNumber: formData.get("customVoucherNumber") ?? "",
  };
}

function dateValue(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function amountValue(value: string) {
  const amount = new Prisma.Decimal(value);
  if (!amount.greaterThan(0)) throw new Error("VOUCHER_AMOUNT_MUST_BE_POSITIVE");
  return amount;
}

async function nextVoucherNumber(
  transaction: Prisma.TransactionClient,
  type: VoucherType,
  voucherDate: Date,
) {
  const year = voucherDate.getUTCFullYear();
  const sequence = await transaction.voucherNumberSequence.upsert({
    where: { type_year: { type, year } },
    create: { type, year, currentValue: 1 },
    update: { currentValue: { increment: 1 } },
    select: { currentValue: true },
  });
  const settings = await transaction.companySettings.findUnique({
    where: { id: "company" },
    select: { receiptVoucherPrefix: true, paymentVoucherPrefix: true },
  });
  const configuredPrefix = type === VoucherType.RECEIPT
    ? settings?.receiptVoucherPrefix
    : settings?.paymentVoucherPrefix;
  const prefix = configuredPrefix?.trim() || (type === VoucherType.RECEIPT ? "RV" : "PV");
  return `${prefix}-${year}-${sequence.currentValue.toString().padStart(6, "0")}`;
}

function knownFailure(error: unknown): BillingActionState | null {
  if (error instanceof Error && error.message === "VOUCHER_AMOUNT_MUST_BE_POSITIVE") {
    return { error: "Amount must be greater than zero." };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { error: "A voucher number conflict occurred. Please try again." };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    return { error: "Another voucher update occurred. Refresh the page and try again." };
  }
  return null;
}

export async function createReceiptVoucher(
  _state: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("VOUCHERS", "CREATE");
  const parsed = receiptSchema.safeParse({
    ...readForm(formData),
    clientId: formData.get("clientId"),
    description: formData.get("description"),
  });
  if (!parsed.success) return actionError(parsed.error.issues);
  let voucherId: string;
  try {
    const voucher = await prisma.$transaction(async (transaction) => {
      const client = await transaction.client.findUnique({
        where: { id: parsed.data.clientId },
        select: { id: true, displayName: true, isActive: true },
      });
      if (!client || !client.isActive) throw new Error("VOUCHER_CLIENT_UNAVAILABLE");
      const voucherDate = dateValue(parsed.data.voucherDate);
      const settings = await transaction.companySettings.findUnique({
        where: { id: "company" },
        select: { currencyCode: true },
      });
      const voucherNumber = parsed.data.customVoucherNumber
        ? parsed.data.customVoucherNumber
        : await nextVoucherNumber(transaction, VoucherType.RECEIPT, voucherDate);
      const created = await transaction.receiptVoucher.create({
        data: {
          voucherNumber,
          clientId: client.id,
          clientName: client.displayName,
          voucherDate,
          amount: amountValue(parsed.data.amount),
          currencyCode: settings?.currencyCode ?? "NPR",
          method: parsed.data.method,
          reference: parsed.data.reference || null,
          description: parsed.data.description,
          createdById: admin.id,
        },
        select: { id: true, voucherNumber: true },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "RECEIPT_VOUCHER_CREATED",
          targetType: "ReceiptVoucher",
          targetId: created.id,
          metadata: { voucherNumber: created.voucherNumber, amount: parsed.data.amount },
        },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    voucherId = voucher.id;
  } catch (error) {
    if (error instanceof Error && error.message === "VOUCHER_CLIENT_UNAVAILABLE") return { error: "Select an active client." };
    const expected = knownFailure(error);
    if (expected) return expected;
    console.error("[admin-vouchers] Receipt voucher creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The receipt voucher could not be saved. Please try again." };
  }
  revalidatePath("/admin/receipt-vouchers");
  redirect(`/admin/receipt-vouchers/${voucherId}`);
}

export async function updateReceiptVoucher(
  voucherId: string,
  _state: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("VOUCHERS", "EDIT");
  const id = z.string().min(1).max(191).safeParse(voucherId);
  const parsed = receiptSchema.safeParse({
    ...readForm(formData),
    clientId: formData.get("clientId"),
    description: formData.get("description"),
  });
  if (!id.success) return { error: "This voucher could not be found." };
  if (!parsed.success) return actionError(parsed.error.issues);
  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const current = await transaction.receiptVoucher.findUnique({
        where: { id: id.data },
        select: {
          clientId: true,
          voucherNumber: true,
          incomeRecord: {
            select: {
              id: true,
              sourcePayment: {
                select: {
                  paymentDate: true,
                  amount: true,
                  method: true,
                  bill: { select: { clientId: true } },
                },
              },
            },
          },
        },
      });
      if (!current) return "missing" as const;
      const client = await transaction.client.findUnique({
        where: { id: parsed.data.clientId },
        select: { id: true, displayName: true, isActive: true },
      });
      if (!client || (!client.isActive && client.id !== current.clientId)) return "client-unavailable" as const;
      const voucherDate = dateValue(parsed.data.voucherDate);
      const amount = amountValue(parsed.data.amount);
      if (current.incomeRecord?.sourcePayment) {
        const payment = current.incomeRecord.sourcePayment;
        if (
          !payment.amount.equals(amount) ||
          payment.paymentDate.getTime() !== voucherDate.getTime() ||
          payment.method !== parsed.data.method ||
          payment.bill.clientId !== client.id
        ) return "source-mismatch" as const;
      }
      await transaction.receiptVoucher.update({
        where: { id: id.data },
        data: {
          voucherNumber: parsed.data.customVoucherNumber || current.voucherNumber,
          clientId: client.id,
          clientName: client.displayName,
          voucherDate,
          amount,
          method: parsed.data.method,
          reference: parsed.data.reference || null,
          description: parsed.data.description,
        },
      });
      if (current.incomeRecord) {
        await transaction.incomeRecord.update({
          where: { id: current.incomeRecord.id },
          data: {
            incomeDate: voucherDate,
            amount,
            method: parsed.data.method,
            clientId: client.id,
            clientName: client.displayName,
            reference: parsed.data.reference || null,
            description: parsed.data.description,
          },
        });
      }
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "RECEIPT_VOUCHER_UPDATED",
          targetType: "ReceiptVoucher",
          targetId: id.data,
          metadata: { voucherNumber: current.voucherNumber, amount: parsed.data.amount },
        },
      });
      return "updated" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (outcome === "missing") return { error: "This voucher could not be found." };
    if (outcome === "client-unavailable") return { error: "Select an active client." };
    if (outcome === "source-mismatch") return { error: "This receipt is linked to a bill payment; its date, amount, method, and client must match that payment." };
  } catch (error) {
    const expected = knownFailure(error);
    if (expected) return expected;
    console.error("[admin-vouchers] Receipt voucher update failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The receipt voucher could not be updated. Please try again." };
  }
  revalidatePath("/admin/receipt-vouchers");
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/accounts/income");
  revalidatePath(`/admin/receipt-vouchers/${id.data}`);
  redirect(`/admin/receipt-vouchers/${id.data}`);
}

export async function createPaymentVoucher(
  _state: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("VOUCHERS", "CREATE");
  const parsed = paymentSchema.safeParse({
    ...readForm(formData),
    payeeName: formData.get("payeeName"),
    purpose: formData.get("purpose"),
  });
  if (!parsed.success) return actionError(parsed.error.issues);
  let voucherId: string;
  try {
    const voucher = await prisma.$transaction(async (transaction) => {
      const voucherDate = dateValue(parsed.data.voucherDate);
      const settings = await transaction.companySettings.findUnique({
        where: { id: "company" },
        select: { currencyCode: true },
      });
      const voucherNumber = await nextVoucherNumber(transaction, VoucherType.PAYMENT, voucherDate);
      const created = await transaction.paymentVoucher.create({
        data: {
          voucherNumber,
          voucherDate,
          payeeName: parsed.data.payeeName,
          purpose: parsed.data.purpose,
          amount: amountValue(parsed.data.amount),
          currencyCode: settings?.currencyCode ?? "NPR",
          method: parsed.data.method,
          reference: parsed.data.reference || null,
          createdById: admin.id,
        },
        select: { id: true, voucherNumber: true },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "PAYMENT_VOUCHER_CREATED",
          targetType: "PaymentVoucher",
          targetId: created.id,
          metadata: { voucherNumber: created.voucherNumber, amount: parsed.data.amount },
        },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    voucherId = voucher.id;
  } catch (error) {
    const expected = knownFailure(error);
    if (expected) return expected;
    console.error("[admin-vouchers] Payment voucher creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The payment voucher could not be saved. Please try again." };
  }
  revalidatePath("/admin/payment-vouchers");
  redirect(`/admin/payment-vouchers/${voucherId}`);
}

export async function updatePaymentVoucher(
  voucherId: string,
  _state: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requirePermission("VOUCHERS", "EDIT");
  const id = z.string().min(1).max(191).safeParse(voucherId);
  const parsed = paymentSchema.safeParse({
    ...readForm(formData),
    payeeName: formData.get("payeeName"),
    purpose: formData.get("purpose"),
  });
  if (!id.success) return { error: "This voucher could not be found." };
  if (!parsed.success) return actionError(parsed.error.issues);
  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const current = await transaction.paymentVoucher.findUnique({
        where: { id: id.data },
        select: { voucherNumber: true, expenseRecord: { select: { id: true } } },
      });
      if (!current) return "missing" as const;
      const voucherDate = dateValue(parsed.data.voucherDate);
      const amount = amountValue(parsed.data.amount);
      await transaction.paymentVoucher.update({
        where: { id: id.data },
        data: {
          voucherDate,
          payeeName: parsed.data.payeeName,
          purpose: parsed.data.purpose,
          amount,
          method: parsed.data.method,
          reference: parsed.data.reference || null,
        },
      });
      if (current.expenseRecord) {
        await transaction.expenseRecord.update({
          where: { id: current.expenseRecord.id },
          data: {
            expenseDate: voucherDate,
            amount,
            method: parsed.data.method,
            paidTo: parsed.data.payeeName,
            reference: parsed.data.reference || null,
            description: parsed.data.purpose,
          },
        });
      }
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "PAYMENT_VOUCHER_UPDATED",
          targetType: "PaymentVoucher",
          targetId: id.data,
          metadata: { voucherNumber: current.voucherNumber, amount: parsed.data.amount },
        },
      });
      return "updated" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (outcome === "missing") return { error: "This voucher could not be found." };
  } catch (error) {
    const expected = knownFailure(error);
    if (expected) return expected;
    console.error("[admin-vouchers] Payment voucher update failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The payment voucher could not be updated. Please try again." };
  }
  revalidatePath("/admin/payment-vouchers");
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/accounts/expenses");
  revalidatePath(`/admin/payment-vouchers/${id.data}`);
  redirect(`/admin/payment-vouchers/${id.data}`);
}
