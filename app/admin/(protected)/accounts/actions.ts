"use server";

import {
  AccountCategoryType,
  AccountRecordType,
  PaymentMethod,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { BillingActionState } from "@/app/admin/(protected)/billing/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export type AccountActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

const dateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid date.");

const baseSchema = z.object({
  date: dateSchema,
  categoryId: z.string().trim().min(1, "Select a category.").max(191),
  description: z.string().trim().min(1, "Enter a description.").max(1000),
  amount: z.string().trim().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Enter a valid amount."),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(100),
});

const incomeSchema = baseSchema.extend({
  clientId: z.string().trim().max(191),
  sourcePaymentId: z.string().trim().max(191),
  sourceReceiptVoucherId: z.string().trim().max(191),
});

const expenseSchema = baseSchema.extend({
  paidTo: z.string().trim().min(1, "Enter the payee or vendor.").max(200),
  sourcePaymentVoucherId: z.string().trim().max(191),
});

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function accountFormData(formData: FormData) {
  return {
    date: formData.get("date"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: formData.get("reference") ?? "",
  };
}

function dateValue(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function amountValue(value: string) {
  const amount = new Prisma.Decimal(value);
  if (!amount.greaterThan(0)) throw new Error("ACCOUNT_AMOUNT_MUST_BE_POSITIVE");
  return amount;
}

async function nextReference(
  transaction: Prisma.TransactionClient,
  type: AccountRecordType,
  date: Date,
) {
  const year = date.getUTCFullYear();
  const sequence = await transaction.accountNumberSequence.upsert({
    where: { type_year: { type, year } },
    create: { type, year, currentValue: 1 },
    update: { currentValue: { increment: 1 } },
    select: { currentValue: true },
  });
  const prefix = type === AccountRecordType.INCOME ? "INC" : "EXP";
  return `${prefix}-${year}-${sequence.currentValue.toString().padStart(6, "0")}`;
}

function knownFailure(error: unknown, noun: string): BillingActionState | null {
  if (error instanceof Error && error.message === "ACCOUNT_AMOUNT_MUST_BE_POSITIVE") {
    return { error: "Amount must be greater than zero." };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { error: "This account entry or linked source already exists." };
    if (error.code === "P2034") return { error: `Another ${noun} update occurred. Refresh and try again.` };
    if (error.code === "P2003") return { error: "A selected category, client, or source record is no longer available." };
  }
  return null;
}

async function validCategory(
  transaction: Prisma.TransactionClient,
  id: string,
  type: AccountCategoryType,
) {
  return transaction.accountCategory.findFirst({ where: { id, type }, select: { id: true } });
}

type IncomeSource = {
  incomeDate: Date;
  amount: Prisma.Decimal;
  currencyCode: string;
  method: PaymentMethod;
  clientId: string | null;
  clientName: string | null;
  reference: string | null;
  description: string;
};

async function getIncomeSource(
  transaction: Prisma.TransactionClient,
  sourcePaymentId: string,
  sourceReceiptVoucherId: string,
  currentId?: string,
): Promise<IncomeSource | "unavailable" | "mismatch" | null> {
  let payment: IncomeSource | null = null;
  let receipt: IncomeSource | null = null;
  if (sourcePaymentId) {
    const row = await transaction.payment.findUnique({
      where: { id: sourcePaymentId },
      include: { bill: { select: { clientId: true, clientName: true, billNumber: true, currencyCode: true } }, incomeRecord: { select: { id: true } } },
    });
    if (!row || (row.incomeRecord && row.incomeRecord.id !== currentId)) return "unavailable";
    payment = {
      incomeDate: row.paymentDate, amount: row.amount, method: row.method,
      currencyCode: row.bill.currencyCode,
      clientId: row.bill.clientId, clientName: row.bill.clientName, reference: row.reference,
      description: row.notes || `Payment received for ${row.bill.billNumber}`,
    };
  }
  if (sourceReceiptVoucherId) {
    const row = await transaction.receiptVoucher.findUnique({
      where: { id: sourceReceiptVoucherId },
      include: { incomeRecord: { select: { id: true } } },
    });
    if (!row || (row.incomeRecord && row.incomeRecord.id !== currentId)) return "unavailable";
    receipt = {
      incomeDate: row.voucherDate, amount: row.amount, method: row.method,
      currencyCode: row.currencyCode,
      clientId: row.clientId, clientName: row.clientName, reference: row.reference,
      description: row.description,
    };
  }
  if (payment && receipt) {
    if (
      !payment.amount.equals(receipt.amount) ||
      payment.currencyCode !== receipt.currencyCode ||
      payment.incomeDate.getTime() !== receipt.incomeDate.getTime() ||
      payment.method !== receipt.method ||
      payment.clientId !== receipt.clientId
    ) return "mismatch";
  }
  return payment ?? receipt;
}

export async function createIncome(
  _state: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requireAdmin();
  const parsed = incomeSchema.safeParse({
    ...accountFormData(formData),
    clientId: formData.get("clientId") ?? "",
    sourcePaymentId: formData.get("sourcePaymentId") ?? "",
    sourceReceiptVoucherId: formData.get("sourceReceiptVoucherId") ?? "",
  });
  if (!parsed.success) return { error: "Review the highlighted fields and try again.", fieldErrors: fieldErrors(parsed.error.issues) };
  if (!parsed.data.amount || !new Prisma.Decimal(parsed.data.amount).greaterThan(0)) return { error: "Amount must be greater than zero." };

  let id = "";
  try {
    const created = await prisma.$transaction(async (transaction) => {
      const category = await validCategory(transaction, parsed.data.categoryId, AccountCategoryType.INCOME);
      if (!category) throw new Error("ACCOUNT_CATEGORY_UNAVAILABLE");
      const settings = await transaction.companySettings.findUnique({ where: { id: "company" }, select: { currencyCode: true } });
      const source = await getIncomeSource(transaction, parsed.data.sourcePaymentId, parsed.data.sourceReceiptVoucherId);
      if (source === "unavailable") throw new Error("ACCOUNT_SOURCE_UNAVAILABLE");
      if (source === "mismatch") throw new Error("ACCOUNT_SOURCE_MISMATCH");
      let clientId = parsed.data.clientId || null;
      let clientName: string | null = null;
      if (clientId) {
        const client = await transaction.client.findUnique({
          where: { id: clientId },
          select: { id: true, displayName: true, isActive: true },
        });
        if (!client || (!client.isActive && source?.clientId !== client.id)) throw new Error("ACCOUNT_CLIENT_UNAVAILABLE");
        clientName = client.displayName;
      }
      if (source) {
        clientId = source.clientId;
        clientName = source.clientName;
      }
      const recordDate = source?.incomeDate ?? dateValue(parsed.data.date);
      const amount = source?.amount ?? amountValue(parsed.data.amount);
      const method = source?.method ?? parsed.data.method;
      const reference = source ? source.reference : parsed.data.reference || null;
      const referenceNumber = await nextReference(transaction, AccountRecordType.INCOME, recordDate);
      const record = await transaction.incomeRecord.create({
        data: {
          referenceNumber,
          incomeDate: recordDate,
          categoryId: category.id,
          description: parsed.data.description || source?.description || "Income",
          amount,
          currencyCode: source?.currencyCode ?? settings?.currencyCode ?? "NPR",
          method,
          clientId,
          clientName,
          reference,
          sourcePaymentId: parsed.data.sourcePaymentId || null,
          sourceReceiptVoucherId: parsed.data.sourceReceiptVoucherId || null,
          createdById: admin.id,
        },
        select: { id: true, referenceNumber: true },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id, action: "INCOME_RECORD_CREATED", targetType: "IncomeRecord", targetId: record.id,
          metadata: { referenceNumber: record.referenceNumber, amount: amount.toFixed(2) },
        },
      });
      return record;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    id = created.id;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ACCOUNT_CATEGORY_UNAVAILABLE") return { error: "Select a valid income category." };
      if (error.message === "ACCOUNT_SOURCE_UNAVAILABLE") return { error: "This source transaction is already linked or unavailable." };
      if (error.message === "ACCOUNT_SOURCE_MISMATCH") return { error: "The selected bill payment and receipt voucher do not describe the same transaction." };
      if (error.message === "ACCOUNT_CLIENT_UNAVAILABLE") return { error: "Select an active client." };
    }
    const expected = knownFailure(error, "income");
    if (expected) return expected;
    console.error("[admin-accounts] Income creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The income record could not be saved. Please try again." };
  }
  revalidateAccountPaths();
  redirect(`/admin/accounts/income/${id}`);
}

export async function updateIncome(
  id: string,
  _state: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requireAdmin();
  const validId = z.string().min(1).max(191).safeParse(id);
  const parsed = incomeSchema.safeParse({
    ...accountFormData(formData),
    clientId: formData.get("clientId") ?? "",
    sourcePaymentId: formData.get("sourcePaymentId") ?? "",
    sourceReceiptVoucherId: formData.get("sourceReceiptVoucherId") ?? "",
  });
  if (!validId.success) return { error: "This income record could not be found." };
  if (!parsed.success) return { error: "Review the highlighted fields and try again.", fieldErrors: fieldErrors(parsed.error.issues) };
  if (!new Prisma.Decimal(parsed.data.amount).greaterThan(0)) return { error: "Amount must be greater than zero." };
  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const current = await transaction.incomeRecord.findUnique({
        where: { id: validId.data },
        select: { referenceNumber: true, currencyCode: true, sourcePaymentId: true, sourceReceiptVoucherId: true },
      });
      if (!current) return "missing" as const;
      if (
        (current.sourcePaymentId && current.sourcePaymentId !== parsed.data.sourcePaymentId) ||
        (current.sourceReceiptVoucherId && current.sourceReceiptVoucherId !== parsed.data.sourceReceiptVoucherId)
      ) return "source-locked" as const;
      const category = await validCategory(transaction, parsed.data.categoryId, AccountCategoryType.INCOME);
      if (!category) return "category" as const;
      const source = await getIncomeSource(transaction, parsed.data.sourcePaymentId, parsed.data.sourceReceiptVoucherId, validId.data);
      if (source === "unavailable") return "source" as const;
      if (source === "mismatch") return "mismatch" as const;
      let clientId = parsed.data.clientId || null;
      let clientName: string | null = null;
      if (clientId) {
        const client = await transaction.client.findUnique({ where: { id: clientId }, select: { id: true, displayName: true, isActive: true } });
        if (!client || (!client.isActive && source?.clientId !== client.id)) return "client" as const;
        clientName = client.displayName;
      }
      if (source) { clientId = source.clientId; clientName = source.clientName; }
      const recordDate = source?.incomeDate ?? dateValue(parsed.data.date);
      const amount = source?.amount ?? amountValue(parsed.data.amount);
      await transaction.incomeRecord.update({
        where: { id: validId.data },
        data: {
          incomeDate: recordDate,
          categoryId: category.id,
          description: parsed.data.description || source?.description || "Income",
          amount,
          currencyCode: source?.currencyCode ?? current.currencyCode,
          method: source?.method ?? parsed.data.method,
          clientId,
          clientName,
          reference: source ? source.reference : parsed.data.reference || null,
          sourcePaymentId: parsed.data.sourcePaymentId || null,
          sourceReceiptVoucherId: parsed.data.sourceReceiptVoucherId || null,
        },
      });
      await transaction.activityLog.create({
        data: { actorId: admin.id, action: "INCOME_RECORD_UPDATED", targetType: "IncomeRecord", targetId: validId.data, metadata: { referenceNumber: current.referenceNumber, amount: amount.toFixed(2) } },
      });
      return "updated" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (outcome === "missing") return { error: "This income record could not be found." };
    if (outcome === "source-locked") return { error: "A linked source cannot be detached or replaced. Delete this account entry to return the source to the account list." };
    if (outcome === "category") return { error: "Select a valid income category." };
    if (outcome === "source") return { error: "This source transaction is already linked or unavailable." };
    if (outcome === "mismatch") return { error: "The selected bill payment and receipt voucher do not describe the same transaction." };
    if (outcome === "client") return { error: "Select an active client." };
  } catch (error) {
    const expected = knownFailure(error, "income");
    if (expected) return expected;
    console.error("[admin-accounts] Income update failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The income record could not be updated. Please try again." };
  }
  revalidateAccountPaths();
  revalidatePath(`/admin/accounts/income/${validId.data}`);
  redirect(`/admin/accounts/income/${validId.data}`);
}

export async function deleteIncome(
  id: string,
  _state: AccountActionState,
  _formData: FormData,
): Promise<AccountActionState> {
  const admin = await requireAdmin();
  const validId = z.string().min(1).max(191).safeParse(id);
  if (!validId.success) return { error: "This income record could not be found." };
  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.incomeRecord.findUnique({ where: { id: validId.data }, select: { referenceNumber: true, amount: true } });
      if (!current) throw new Error("ACCOUNT_RECORD_MISSING");
      await transaction.incomeRecord.delete({ where: { id: validId.data } });
      await transaction.activityLog.create({
        data: { actorId: admin.id, action: "INCOME_RECORD_DELETED", targetType: "IncomeRecord", targetId: validId.data, metadata: { referenceNumber: current.referenceNumber, amount: current.amount.toFixed(2) } },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_RECORD_MISSING") return { error: "This income record could not be found." };
    console.error("[admin-accounts] Income deletion failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The income record could not be deleted. Please try again." };
  }
  revalidateAccountPaths();
  redirect("/admin/accounts/income");
}

export async function createExpense(
  _state: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requireAdmin();
  const parsed = expenseSchema.safeParse({
    ...accountFormData(formData),
    paidTo: formData.get("paidTo"),
    sourcePaymentVoucherId: formData.get("sourcePaymentVoucherId") ?? "",
  });
  if (!parsed.success) return { error: "Review the highlighted fields and try again.", fieldErrors: fieldErrors(parsed.error.issues) };
  if (!new Prisma.Decimal(parsed.data.amount).greaterThan(0)) return { error: "Amount must be greater than zero." };
  let id = "";
  try {
    const created = await prisma.$transaction(async (transaction) => {
      const category = await validCategory(transaction, parsed.data.categoryId, AccountCategoryType.EXPENSE);
      if (!category) throw new Error("ACCOUNT_CATEGORY_UNAVAILABLE");
      let source: { id: string; date: Date; amount: Prisma.Decimal; currencyCode: string; method: PaymentMethod; payee: string; purpose: string; reference: string | null } | null = null;
      if (parsed.data.sourcePaymentVoucherId) {
        const row = await transaction.paymentVoucher.findUnique({
          where: { id: parsed.data.sourcePaymentVoucherId },
          include: { expenseRecord: { select: { id: true } } },
        });
        if (!row || row.expenseRecord) throw new Error("ACCOUNT_SOURCE_UNAVAILABLE");
        source = { id: row.id, date: row.voucherDate, amount: row.amount, currencyCode: row.currencyCode, method: row.method, payee: row.payeeName, purpose: row.purpose, reference: row.reference };
      }
      const settings = await transaction.companySettings.findUnique({ where: { id: "company" }, select: { currencyCode: true } });
      const recordDate = source?.date ?? dateValue(parsed.data.date);
      const amount = source?.amount ?? amountValue(parsed.data.amount);
      const referenceNumber = await nextReference(transaction, AccountRecordType.EXPENSE, recordDate);
      const record = await transaction.expenseRecord.create({
        data: {
          referenceNumber,
          expenseDate: recordDate,
          categoryId: category.id,
          description: parsed.data.description || source?.purpose || "Expense",
          amount,
          currencyCode: source?.currencyCode ?? settings?.currencyCode ?? "NPR",
          method: source?.method ?? parsed.data.method,
          paidTo: source?.payee ?? parsed.data.paidTo,
          reference: source ? source.reference : parsed.data.reference || null,
          sourcePaymentVoucherId: source?.id ?? null,
          createdById: admin.id,
        },
        select: { id: true, referenceNumber: true },
      });
      await transaction.activityLog.create({
        data: { actorId: admin.id, action: "EXPENSE_RECORD_CREATED", targetType: "ExpenseRecord", targetId: record.id, metadata: { referenceNumber: record.referenceNumber, amount: amount.toFixed(2) } },
      });
      return record;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    id = created.id;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ACCOUNT_CATEGORY_UNAVAILABLE") return { error: "Select a valid expense category." };
      if (error.message === "ACCOUNT_SOURCE_UNAVAILABLE") return { error: "This payment voucher is already linked or unavailable." };
    }
    const expected = knownFailure(error, "expense");
    if (expected) return expected;
    console.error("[admin-accounts] Expense creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The expense record could not be saved. Please try again." };
  }
  revalidateAccountPaths();
  redirect(`/admin/accounts/expenses/${id}`);
}

export async function updateExpense(
  id: string,
  _state: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const admin = await requireAdmin();
  const validId = z.string().min(1).max(191).safeParse(id);
  const parsed = expenseSchema.safeParse({
    ...accountFormData(formData),
    paidTo: formData.get("paidTo"),
    sourcePaymentVoucherId: formData.get("sourcePaymentVoucherId") ?? "",
  });
  if (!validId.success) return { error: "This expense record could not be found." };
  if (!parsed.success) return { error: "Review the highlighted fields and try again.", fieldErrors: fieldErrors(parsed.error.issues) };
  if (!new Prisma.Decimal(parsed.data.amount).greaterThan(0)) return { error: "Amount must be greater than zero." };
  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const current = await transaction.expenseRecord.findUnique({
        where: { id: validId.data },
        select: { referenceNumber: true, currencyCode: true, sourcePaymentVoucherId: true },
      });
      if (!current) return "missing" as const;
      if (
        current.sourcePaymentVoucherId &&
        current.sourcePaymentVoucherId !== parsed.data.sourcePaymentVoucherId
      ) return "source-locked" as const;
      const category = await validCategory(transaction, parsed.data.categoryId, AccountCategoryType.EXPENSE);
      if (!category) return "category" as const;
      let source: { id: string; date: Date; amount: Prisma.Decimal; currencyCode: string; method: PaymentMethod; payee: string; reference: string | null } | null = null;
      if (parsed.data.sourcePaymentVoucherId) {
        const row = await transaction.paymentVoucher.findUnique({
          where: { id: parsed.data.sourcePaymentVoucherId },
          include: { expenseRecord: { select: { id: true } } },
        });
        if (!row || (row.expenseRecord && row.expenseRecord.id !== validId.data)) return "source" as const;
        source = { id: row.id, date: row.voucherDate, amount: row.amount, currencyCode: row.currencyCode, method: row.method, payee: row.payeeName, reference: row.reference };
      }
      const recordDate = source?.date ?? dateValue(parsed.data.date);
      const amount = source?.amount ?? amountValue(parsed.data.amount);
      await transaction.expenseRecord.update({
        where: { id: validId.data },
        data: {
          expenseDate: recordDate,
          categoryId: category.id,
          description: parsed.data.description || source?.payee || "Expense",
          amount,
          currencyCode: source?.currencyCode ?? current.currencyCode,
          method: source?.method ?? parsed.data.method,
          paidTo: source?.payee ?? parsed.data.paidTo,
          reference: source ? source.reference : parsed.data.reference || null,
          sourcePaymentVoucherId: source?.id ?? null,
        },
      });
      await transaction.activityLog.create({
        data: { actorId: admin.id, action: "EXPENSE_RECORD_UPDATED", targetType: "ExpenseRecord", targetId: validId.data, metadata: { referenceNumber: current.referenceNumber, amount: amount.toFixed(2) } },
      });
      return "updated" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (outcome === "missing") return { error: "This expense record could not be found." };
    if (outcome === "source-locked") return { error: "A linked voucher cannot be detached or replaced. Delete this account entry to return the voucher to the expense list." };
    if (outcome === "category") return { error: "Select a valid expense category." };
    if (outcome === "source") return { error: "This payment voucher is already linked or unavailable." };
  } catch (error) {
    const expected = knownFailure(error, "expense");
    if (expected) return expected;
    console.error("[admin-accounts] Expense update failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The expense record could not be updated. Please try again." };
  }
  revalidateAccountPaths();
  revalidatePath(`/admin/accounts/expenses/${validId.data}`);
  redirect(`/admin/accounts/expenses/${validId.data}`);
}

export async function deleteExpense(
  id: string,
  _state: AccountActionState,
  _formData: FormData,
): Promise<AccountActionState> {
  const admin = await requireAdmin();
  const validId = z.string().min(1).max(191).safeParse(id);
  if (!validId.success) return { error: "This expense record could not be found." };
  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.expenseRecord.findUnique({ where: { id: validId.data }, select: { referenceNumber: true, amount: true } });
      if (!current) throw new Error("ACCOUNT_RECORD_MISSING");
      await transaction.expenseRecord.delete({ where: { id: validId.data } });
      await transaction.activityLog.create({
        data: { actorId: admin.id, action: "EXPENSE_RECORD_DELETED", targetType: "ExpenseRecord", targetId: validId.data, metadata: { referenceNumber: current.referenceNumber, amount: current.amount.toFixed(2) } },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_RECORD_MISSING") return { error: "This expense record could not be found." };
    console.error("[admin-accounts] Expense deletion failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The expense record could not be deleted. Please try again." };
  }
  revalidateAccountPaths();
  redirect("/admin/accounts/expenses");
}

async function createCategory(
  type: AccountCategoryType,
  formData: FormData,
): Promise<AccountActionState> {
  await requireAdmin();
  const parsed = z.string().trim().min(1, "Enter a category name.").max(100).safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a category name." };
  try {
    await prisma.accountCategory.create({ data: { type, name: parsed.data } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A category with this name already exists." };
    }
    console.error("[admin-accounts] Category creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The category could not be added. Please try again." };
  }
  revalidateAccountPaths();
  return { success: "Category added." };
}

export async function createIncomeCategory(
  _state: AccountActionState,
  formData: FormData,
) {
  return createCategory(AccountCategoryType.INCOME, formData);
}

export async function createExpenseCategory(
  _state: AccountActionState,
  formData: FormData,
) {
  return createCategory(AccountCategoryType.EXPENSE, formData);
}

function revalidateAccountPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/accounts/income");
  revalidatePath("/admin/accounts/expenses");
  revalidatePath("/admin/receipt-vouchers");
  revalidatePath("/admin/payment-vouchers");
  revalidatePath("/admin/billing");
}
