import "server-only";

import { AccountCategoryType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const accountPageSize = 20;

const systemIncomeCategories = {
  billPayments: "system-income-bill-payments",
  clientReceipts: "system-income-client-receipts",
} as const;
const systemExpenseCategory = "system-expense-payment-vouchers";

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeAccountFilters(
  params: Record<string, string | string[] | undefined>,
) {
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const rawPage = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 500) : 1;
  const fromValue = typeof params.from === "string" ? params.from : "";
  const toValue = typeof params.to === "string" ? params.to : "";
  const from = isValidDate(fromValue) ? fromValue : "";
  const to = isValidDate(toValue) ? toValue : "";
  const categoryId =
    typeof params.category === "string" && params.category.length <= 191
      ? params.category
      : "";
  return {
    q,
    page: requestedPage,
    from: from && to && from > to ? to : from,
    to: from && to && from > to ? from : to,
    categoryId,
  };
}

function dateRange(from: string, to: string) {
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
  };
}

function listDateWhere(from: string, to: string) {
  const range = dateRange(from, to);
  return Object.keys(range).length ? range : undefined;
}

export async function listAccountCategories(type: AccountCategoryType) {
  return prisma.accountCategory.findMany({
    where: { type },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isSystem: true },
  });
}

function orderEntries<T extends { date: Date; id: string }>(entries: T[]) {
  return entries.sort((a, b) => b.date.getTime() - a.date.getTime() || b.id.localeCompare(a.id));
}

export async function listIncomeRecords(
  params: Record<string, string | string[] | undefined>,
) {
  const filters = normalizeAccountFilters(params);
  const date = listDateWhere(filters.from, filters.to);
  const recordWhere: Prisma.IncomeRecordWhereInput = {
    ...(date ? { incomeDate: date } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.q
      ? {
          OR: [
            { referenceNumber: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
            { reference: { contains: filters.q, mode: "insensitive" } },
            { clientName: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const paymentWhere: Prisma.PaymentWhereInput = {
    incomeRecord: null,
    ...(date ? { paymentDate: date } : {}),
    ...(filters.q
      ? {
          OR: [
            { bill: { billNumber: { contains: filters.q, mode: "insensitive" } } },
            { bill: { clientName: { contains: filters.q, mode: "insensitive" } } },
            { reference: { contains: filters.q, mode: "insensitive" } },
            { notes: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const receiptWhere: Prisma.ReceiptVoucherWhereInput = {
    incomeRecord: null,
    ...(date ? { voucherDate: date } : {}),
    ...(filters.q
      ? {
          OR: [
            { voucherNumber: { contains: filters.q, mode: "insensitive" } },
            { clientName: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
            { reference: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const paymentCategoryMatches =
    !filters.categoryId || filters.categoryId === systemIncomeCategories.billPayments;
  const receiptCategoryMatches =
    !filters.categoryId || filters.categoryId === systemIncomeCategories.clientReceipts;
  const resolvedPaymentWhere = paymentCategoryMatches ? paymentWhere : { ...paymentWhere, id: "__no-category-match__" };
  const resolvedReceiptWhere = receiptCategoryMatches ? receiptWhere : { ...receiptWhere, id: "__no-category-match__" };

  const pageSize = filters.page * accountPageSize;
  const [recordCount, paymentCount, receiptCount, records, payments, receipts] =
    await prisma.$transaction([
      prisma.incomeRecord.count({ where: recordWhere }),
      prisma.payment.count({ where: resolvedPaymentWhere }),
      prisma.receiptVoucher.count({ where: resolvedReceiptWhere }),
      prisma.incomeRecord.findMany({
        where: recordWhere,
        orderBy: [{ incomeDate: "desc" }, { id: "desc" }],
        take: pageSize,
        include: { category: { select: { name: true } } },
      }),
      prisma.payment.findMany({
        where: resolvedPaymentWhere,
        orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
        take: pageSize,
          include: { bill: { select: { id: true, billNumber: true, clientName: true, currencyCode: true } } },
      }),
      prisma.receiptVoucher.findMany({
        where: resolvedReceiptWhere,
        orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
        take: pageSize,
        select: {
          id: true,
          voucherNumber: true,
          voucherDate: true,
          clientName: true,
          description: true,
          amount: true,
          currencyCode: true,
        },
      }),
    ]);

  const entries = orderEntries([
    ...records.map((record) => ({
      id: record.id,
      number: record.referenceNumber,
      date: record.incomeDate,
      party: record.clientName ?? "—",
      description: record.description,
      category: record.category.name,
      amount: record.amount.toFixed(2),
      currencyCode: record.currencyCode,
      href: `/admin/accounts/income/${record.id}`,
      kind: "Income record",
    })),
    ...payments.map((payment) => ({
      id: `payment:${payment.id}`,
      number: `${payment.bill.billNumber} payment`,
      date: payment.paymentDate,
      party: payment.bill.clientName,
      description: payment.notes || `Payment received for ${payment.bill.billNumber}`,
      category: "Bill payments",
      amount: payment.amount.toFixed(2),
      currencyCode: payment.bill.currencyCode,
      href: `/admin/billing/${payment.bill.id}`,
      kind: "Bill payment",
    })),
    ...receipts.map((receipt) => ({
      id: `receipt:${receipt.id}`,
      number: receipt.voucherNumber,
      date: receipt.voucherDate,
      party: receipt.clientName,
      description: receipt.description,
      category: "Client receipts",
      amount: receipt.amount.toFixed(2),
      currencyCode: receipt.currencyCode,
      href: `/admin/receipt-vouchers/${receipt.id}`,
      kind: "Receipt voucher",
    })),
  ]);
  const total = recordCount + paymentCount + receiptCount;
  const pages = Math.max(1, Math.ceil(total / accountPageSize));
  const page = Math.min(filters.page, pages);
  const offset = (page - 1) * accountPageSize;
  return {
    ...filters,
    page,
    pages,
    total,
    entries: entries.slice(offset, offset + accountPageSize),
    categories: await listAccountCategories(AccountCategoryType.INCOME),
  };
}

export async function listExpenseRecords(
  params: Record<string, string | string[] | undefined>,
) {
  const filters = normalizeAccountFilters(params);
  const date = listDateWhere(filters.from, filters.to);
  const recordWhere: Prisma.ExpenseRecordWhereInput = {
    ...(date ? { expenseDate: date } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.q
      ? {
          OR: [
            { referenceNumber: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
            { reference: { contains: filters.q, mode: "insensitive" } },
            { paidTo: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const voucherCategoryMatches =
    !filters.categoryId || filters.categoryId === systemExpenseCategory;
  const voucherWhere: Prisma.PaymentVoucherWhereInput = {
    expenseRecord: null,
    ...(date ? { voucherDate: date } : {}),
    ...(filters.q
      ? {
          OR: [
            { voucherNumber: { contains: filters.q, mode: "insensitive" } },
            { payeeName: { contains: filters.q, mode: "insensitive" } },
            { purpose: { contains: filters.q, mode: "insensitive" } },
            { reference: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(!voucherCategoryMatches ? { id: "__no-category-match__" } : {}),
  };
  const take = filters.page * accountPageSize;
  const [recordCount, voucherCount, records, vouchers] = await prisma.$transaction([
    prisma.expenseRecord.count({ where: recordWhere }),
    prisma.paymentVoucher.count({ where: voucherWhere }),
    prisma.expenseRecord.findMany({
      where: recordWhere,
      orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
      take,
      include: { category: { select: { name: true } } },
    }),
    prisma.paymentVoucher.findMany({
      where: voucherWhere,
      orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        voucherNumber: true,
        voucherDate: true,
        payeeName: true,
        purpose: true,
        amount: true,
        currencyCode: true,
      },
    }),
  ]);
  const entries = orderEntries([
    ...records.map((record) => ({
      id: record.id,
      number: record.referenceNumber,
      date: record.expenseDate,
      party: record.paidTo,
      description: record.description,
      category: record.category.name,
      amount: record.amount.toFixed(2),
      currencyCode: record.currencyCode,
      href: `/admin/accounts/expenses/${record.id}`,
      kind: "Expense record",
    })),
    ...vouchers.map((voucher) => ({
      id: `voucher:${voucher.id}`,
      number: voucher.voucherNumber,
      date: voucher.voucherDate,
      party: voucher.payeeName,
      description: voucher.purpose,
      category: "Payment vouchers",
      amount: voucher.amount.toFixed(2),
      currencyCode: voucher.currencyCode,
      href: `/admin/payment-vouchers/${voucher.id}`,
      kind: "Payment voucher",
    })),
  ]);
  const total = recordCount + voucherCount;
  const pages = Math.max(1, Math.ceil(total / accountPageSize));
  const page = Math.min(filters.page, pages);
  const offset = (page - 1) * accountPageSize;
  return {
    ...filters,
    page,
    pages,
    total,
    entries: entries.slice(offset, offset + accountPageSize),
    categories: await listAccountCategories(AccountCategoryType.EXPENSE),
  };
}

export async function getIncomeFormData(recordId?: string) {
  const [categories, clients, payments, receipts, current] = await Promise.all([
    prisma.accountCategory.findMany({
      where: { type: AccountCategoryType.INCOME },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
    prisma.payment.findMany({
      where: { incomeRecord: null },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { bill: { select: { billNumber: true, clientId: true, clientName: true, currencyCode: true } } },
    }),
    prisma.receiptVoucher.findMany({
      where: { incomeRecord: null },
      orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true, voucherNumber: true, voucherDate: true, clientId: true, clientName: true,
        description: true, amount: true, method: true, reference: true,
      },
    }),
    recordId
      ? prisma.incomeRecord.findUnique({
          where: { id: recordId },
          include: {
            sourcePayment: {
              include: {
                bill: {
                  select: { billNumber: true, clientId: true, clientName: true, currencyCode: true },
                },
              },
            },
            sourceReceiptVoucher: true,
          },
        })
      : Promise.resolve(null),
  ]);
  if (recordId && !current) return null;
  if (current?.clientId && !clients.some((client) => client.id === current.clientId)) {
    clients.push({ id: current.clientId, displayName: current.clientName ?? "Inactive client" });
  }
  const paymentOptions = [...payments];
  if (current?.sourcePayment && !paymentOptions.some((payment) => payment.id === current.sourcePaymentId)) {
    paymentOptions.push(current.sourcePayment);
  }
  const receiptOptions = [...receipts];
  if (current?.sourceReceiptVoucher && !receiptOptions.some((voucher) => voucher.id === current.sourceReceiptVoucherId)) {
    receiptOptions.push(current.sourceReceiptVoucher);
  }
  return {
    categories,
    clients,
    paymentSources: paymentOptions.map((payment) => ({
      id: payment.id,
      label: `${payment.bill.billNumber} · ${payment.bill.clientName} · ${payment.amount.toFixed(2)}`,
      date: payment.paymentDate.toISOString().slice(0, 10),
      amount: payment.amount.toFixed(2),
      method: payment.method,
      clientId: payment.bill.clientId,
      clientName: payment.bill.clientName,
      description: payment.notes || `Payment received for ${payment.bill.billNumber}`,
      reference: payment.reference ?? "",
    })),
    receiptSources: receiptOptions.map((receipt) => ({
      id: receipt.id,
      label: `${receipt.voucherNumber} · ${receipt.clientName} · ${receipt.amount.toFixed(2)}`,
      date: receipt.voucherDate.toISOString().slice(0, 10),
      amount: receipt.amount.toFixed(2),
      method: receipt.method,
      clientId: receipt.clientId,
      clientName: receipt.clientName,
      description: receipt.description,
      reference: receipt.reference ?? "",
    })),
    initial: current
      ? {
          incomeDate: current.incomeDate.toISOString().slice(0, 10),
          categoryId: current.categoryId,
          description: current.description,
          amount: current.amount.toFixed(2),
          currencyCode: current.currencyCode,
          method: current.method,
          clientId: current.clientId ?? "",
          reference: current.reference ?? "",
          sourcePaymentId: current.sourcePaymentId ?? "",
          sourceReceiptVoucherId: current.sourceReceiptVoucherId ?? "",
        }
      : undefined,
  };
}

export async function getExpenseFormData(recordId?: string) {
  const [categories, vouchers, current] = await Promise.all([
    prisma.accountCategory.findMany({
      where: { type: AccountCategoryType.EXPENSE },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.paymentVoucher.findMany({
      where: { expenseRecord: null },
      orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true, voucherNumber: true, voucherDate: true, payeeName: true, purpose: true,
        amount: true, method: true, reference: true,
      },
    }),
    recordId
      ? prisma.expenseRecord.findUnique({ where: { id: recordId }, include: { sourcePaymentVoucher: true } })
      : Promise.resolve(null),
  ]);
  if (recordId && !current) return null;
  const voucherOptions = [...vouchers];
  if (current?.sourcePaymentVoucher && !voucherOptions.some((voucher) => voucher.id === current.sourcePaymentVoucherId)) {
    voucherOptions.push(current.sourcePaymentVoucher);
  }
  return {
    categories,
    paymentSources: voucherOptions.map((voucher) => ({
      id: voucher.id,
      label: `${voucher.voucherNumber} · ${voucher.payeeName} · ${voucher.amount.toFixed(2)}`,
      date: voucher.voucherDate.toISOString().slice(0, 10),
      amount: voucher.amount.toFixed(2),
      method: voucher.method,
      paidTo: voucher.payeeName,
      description: voucher.purpose,
      reference: voucher.reference ?? "",
    })),
    initial: current
      ? {
          expenseDate: current.expenseDate.toISOString().slice(0, 10),
          categoryId: current.categoryId,
          description: current.description,
          amount: current.amount.toFixed(2),
          currencyCode: current.currencyCode,
          method: current.method,
          paidTo: current.paidTo,
          reference: current.reference ?? "",
          sourcePaymentVoucherId: current.sourcePaymentVoucherId ?? "",
        }
      : undefined,
  };
}

export function getIncomeRecord(id: string) {
  return prisma.incomeRecord.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      client: { select: { displayName: true } },
      sourcePayment: { include: { bill: { select: { id: true, billNumber: true } } } },
      sourceReceiptVoucher: { select: { id: true, voucherNumber: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
}

export function getExpenseRecord(id: string) {
  return prisma.expenseRecord.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      sourcePaymentVoucher: { select: { id: true, voucherNumber: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
}

export async function getAccountsOverview(from = "", to = "") {
  const date = listDateWhere(from, to);
  const incomeWhere: Prisma.IncomeRecordWhereInput = date ? { incomeDate: date } : {};
  const paymentWhere: Prisma.PaymentWhereInput = { incomeRecord: null, ...(date ? { paymentDate: date } : {}) };
  const receiptWhere: Prisma.ReceiptVoucherWhereInput = { incomeRecord: null, ...(date ? { voucherDate: date } : {}) };
  const expenseWhere: Prisma.ExpenseRecordWhereInput = date ? { expenseDate: date } : {};
  const paymentVoucherWhere: Prisma.PaymentVoucherWhereInput = { expenseRecord: null, ...(date ? { voucherDate: date } : {}) };
  const [
    incomeTotals,
    paymentTotals,
    receiptTotals,
    expenseTotals,
    voucherTotals,
    incomeRecords,
    payments,
    receipts,
    expenseRecords,
    vouchers,
  ] =
    await prisma.$transaction([
      prisma.incomeRecord.findMany({ where: incomeWhere, select: { amount: true, currencyCode: true } }),
      prisma.payment.findMany({ where: paymentWhere, select: { amount: true, bill: { select: { currencyCode: true } } } }),
      prisma.receiptVoucher.findMany({ where: receiptWhere, select: { amount: true, currencyCode: true } }),
      prisma.expenseRecord.findMany({ where: expenseWhere, select: { amount: true, currencyCode: true } }),
      prisma.paymentVoucher.findMany({ where: paymentVoucherWhere, select: { amount: true, currencyCode: true } }),
      prisma.incomeRecord.findMany({
        where: incomeWhere,
        orderBy: [{ incomeDate: "desc" }, { id: "desc" }],
        take: 5,
        include: { category: { select: { name: true } } },
      }),
      prisma.payment.findMany({
        where: paymentWhere,
        orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
        take: 5,
        include: { bill: { select: { id: true, billNumber: true, clientName: true, currencyCode: true } } },
      }),
      prisma.receiptVoucher.findMany({
        where: receiptWhere,
        orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
        take: 5,
        select: { id: true, voucherNumber: true, voucherDate: true, clientName: true, description: true, amount: true, currencyCode: true },
      }),
      prisma.expenseRecord.findMany({
        where: expenseWhere,
        orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
        take: 5,
        include: { category: { select: { name: true } } },
      }),
      prisma.paymentVoucher.findMany({
        where: paymentVoucherWhere,
        orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
        take: 5,
        select: { id: true, voucherNumber: true, voucherDate: true, payeeName: true, purpose: true, amount: true, currencyCode: true },
      }),
    ]);
  const incomeEntries = orderEntries([
    ...incomeRecords.map((record) => ({
      id: record.id, number: record.referenceNumber, date: record.incomeDate,
      party: record.clientName ?? "—", description: record.description, category: record.category.name,
      amount: record.amount,       currencyCode: record.currencyCode, href: `/admin/accounts/income/${record.id}`,
    })),
    ...payments.map((payment) => ({
      id: `payment:${payment.id}`, number: `${payment.bill.billNumber} payment`, date: payment.paymentDate,
      party: payment.bill.clientName, description: payment.notes || `Payment received for ${payment.bill.billNumber}`,
      category: "Bill payments", amount: payment.amount, currencyCode: payment.bill.currencyCode,
      href: `/admin/billing/${payment.bill.id}`,
    })),
    ...receipts.map((receipt) => ({
      id: `receipt:${receipt.id}`, number: receipt.voucherNumber, date: receipt.voucherDate,
      party: receipt.clientName, description: receipt.description, category: "Client receipts",
      amount: receipt.amount, currencyCode: receipt.currencyCode, href: `/admin/receipt-vouchers/${receipt.id}`,
    })),
  ]);
  const expenseEntries = orderEntries([
    ...expenseRecords.map((record) => ({
      id: record.id, number: record.referenceNumber, date: record.expenseDate, party: record.paidTo,
      description: record.description, category: record.category.name, amount: record.amount,
      currencyCode: record.currencyCode, href: `/admin/accounts/expenses/${record.id}`,
    })),
    ...vouchers.map((voucher) => ({
      id: `voucher:${voucher.id}`, number: voucher.voucherNumber, date: voucher.voucherDate,
      party: voucher.payeeName, description: voucher.purpose, category: "Payment vouchers",
      amount: voucher.amount, currencyCode: voucher.currencyCode, href: `/admin/payment-vouchers/${voucher.id}`,
    })),
  ]);
  const totalsByCurrency = new Map<string, { income: Prisma.Decimal; expenses: Prisma.Decimal }>();
  const addTotal = (currencyCode: string, type: "income" | "expenses", amount: Prisma.Decimal) => {
    const totals = totalsByCurrency.get(currencyCode) ?? {
      income: new Prisma.Decimal(0),
      expenses: new Prisma.Decimal(0),
    };
    totals[type] = totals[type].add(amount);
    totalsByCurrency.set(currencyCode, totals);
  };
  for (const record of incomeTotals) addTotal(record.currencyCode, "income", record.amount);
  for (const payment of paymentTotals) addTotal(payment.bill.currencyCode, "income", payment.amount);
  for (const receipt of receiptTotals) addTotal(receipt.currencyCode, "income", receipt.amount);
  for (const record of expenseTotals) addTotal(record.currencyCode, "expenses", record.amount);
  for (const voucher of voucherTotals) addTotal(voucher.currencyCode, "expenses", voucher.amount);

  const summarizedTotals = [...totalsByCurrency].sort(([left], [right]) => left.localeCompare(right)).map(([currencyCode, totals]) => ({
    currencyCode,
    totalIncome: totals.income.toFixed(2),
    totalExpenses: totals.expenses.toFixed(2),
    netBalance: totals.income.sub(totals.expenses).toFixed(2),
  }));
  return {
    totalsByCurrency: summarizedTotals,
    income: incomeEntries.slice(0, 5).map((entry) => ({ ...entry, amount: entry.amount.toFixed(2) })),
    expenses: expenseEntries.slice(0, 5).map((entry) => ({ ...entry, amount: entry.amount.toFixed(2) })),
  };
}

export const accountSystemCategoryIds = {
  billPayments: systemIncomeCategories.billPayments,
  clientReceipts: systemIncomeCategories.clientReceipts,
  paymentVouchers: systemExpenseCategory,
};
