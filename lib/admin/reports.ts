import "server-only";

import {
  AccountCategoryType,
  BillStatus,
  ComplianceStatus,
  Prisma,
  TaxFilingStatus,
} from "@prisma/client";
import { getTaxDashboard } from "@/lib/admin/tax";
import { accountSystemCategoryIds } from "@/lib/admin/accounts";
import { prisma } from "@/lib/prisma";

const pageSize = 20;

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function queryString(params: Record<string, string | string[] | undefined>, key: string) {
  return typeof params[key] === "string" ? params[key] as string : "";
}

function pageNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 500) : 1;
}

export function normalizeReportFilters(params: Record<string, string | string[] | undefined>) {
  let from = queryString(params, "from");
  let to = queryString(params, "to");
  from = isValidDate(from) ? from : "";
  to = isValidDate(to) ? to : "";
  if (from && to && from > to) [from, to] = [to, from];
  return {
    from,
    to,
    q: queryString(params, "q").trim().slice(0, 100),
    clientId: queryString(params, "client").slice(0, 191),
    status: Object.values(BillStatus).includes(queryString(params, "status") as BillStatus)
      ? queryString(params, "status") as BillStatus
      : "",
    category: queryString(params, "category").slice(0, 191),
    page: pageNumber(queryString(params, "page")),
  };
}

function dateFilter(from: string, to: string) {
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
  };
}

function dateWhere(from: string, to: string) {
  const range = dateFilter(from, to);
  return Object.keys(range).length ? range : undefined;
}

function decimal() {
  return new Prisma.Decimal(0);
}

function sumByCurrency(
  target: Map<string, Prisma.Decimal>,
  currencyCode: string,
  amount: Prisma.Decimal,
) {
  target.set(currencyCode, (target.get(currencyCode) ?? decimal()).add(amount));
}

function currencyRows(
  income: Map<string, Prisma.Decimal>,
  expenses: Map<string, Prisma.Decimal>,
) {
  const currencies = new Set([...income.keys(), ...expenses.keys()]);
  return [...currencies].sort().map((currencyCode) => {
    const totalIncome = income.get(currencyCode) ?? decimal();
    const totalExpenses = expenses.get(currencyCode) ?? decimal();
    return {
      currencyCode,
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netBalance: totalIncome.sub(totalExpenses).toFixed(2),
    };
  });
}

export async function getReportsDashboard(params: Record<string, string | string[] | undefined>) {
  const filters = normalizeReportFilters(params);
  const billDate = dateWhere(filters.from, filters.to);
  const paymentDate = dateWhere(filters.from, filters.to);
  const incomeDate = dateWhere(filters.from, filters.to);
  const expenseDate = dateWhere(filters.from, filters.to);
  const activeBillWhere: Prisma.BillWhereInput = {
    status: { notIn: [BillStatus.CANCELLED, BillStatus.DRAFT] },
    ...(billDate ? { billDate } : {}),
  };
  const [
    activeBills,
    billPayments,
    incomeRecords,
    standalonePayments,
    standaloneReceipts,
    expenseRecords,
    standalonePaymentVouchers,
    recentIncomeRecords,
    recentBillPayments,
    recentReceipts,
    recentExpenses,
    recentPaymentVouchers,
    settings,
    tax,
    pendingCompliance,
    completedCompliance,
    overdueCompliance,
    taxRecordCount,
  ] = await Promise.all([
    prisma.bill.findMany({
      where: activeBillWhere,
      select: { id: true, currencyCode: true, totalAmount: true, status: true, payments: { select: { amount: true } } },
    }),
    prisma.payment.findMany({
      where: paymentDate ? { paymentDate } : {},
      select: { amount: true, bill: { select: { currencyCode: true } } },
    }),
    prisma.incomeRecord.findMany({
      where: incomeDate ? { incomeDate } : {},
      select: { amount: true, currencyCode: true },
    }),
    prisma.payment.findMany({
      where: { incomeRecord: null, ...(paymentDate ? { paymentDate } : {}) },
      select: { amount: true, bill: { select: { currencyCode: true } } },
    }),
    prisma.receiptVoucher.findMany({
      where: { incomeRecord: null, ...(incomeDate ? { voucherDate: incomeDate } : {}) },
      select: { amount: true, currencyCode: true },
    }),
    prisma.expenseRecord.findMany({
      where: expenseDate ? { expenseDate } : {},
      select: { amount: true, currencyCode: true },
    }),
    prisma.paymentVoucher.findMany({
      where: { expenseRecord: null, ...(expenseDate ? { voucherDate: expenseDate } : {}) },
      select: { amount: true, currencyCode: true },
    }),
    prisma.incomeRecord.findMany({
      where: incomeDate ? { incomeDate } : {},
      orderBy: [{ incomeDate: "desc" }, { id: "desc" }],
      take: 8,
      select: { id: true, referenceNumber: true, incomeDate: true, description: true, amount: true, currencyCode: true, clientName: true },
    }),
    prisma.payment.findMany({
      where: { incomeRecord: null, ...(paymentDate ? { paymentDate } : {}) },
      orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
      take: 8,
      select: { id: true, paymentDate: true, amount: true, bill: { select: { id: true, billNumber: true, clientName: true, currencyCode: true } } },
    }),
    prisma.receiptVoucher.findMany({
      where: { incomeRecord: null, ...(incomeDate ? { voucherDate: incomeDate } : {}) },
      orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
      take: 8,
      select: { id: true, voucherNumber: true, voucherDate: true, amount: true, currencyCode: true, clientName: true, description: true },
    }),
    prisma.expenseRecord.findMany({
      where: expenseDate ? { expenseDate } : {},
      orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
      take: 8,
      select: { id: true, referenceNumber: true, expenseDate: true, amount: true, currencyCode: true, paidTo: true, description: true },
    }),
    prisma.paymentVoucher.findMany({
      where: { expenseRecord: null, ...(expenseDate ? { voucherDate: expenseDate } : {}) },
      orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
      take: 8,
      select: { id: true, voucherNumber: true, voucherDate: true, amount: true, currencyCode: true, payeeName: true, purpose: true },
    }),
    prisma.companySettings.findUnique({ where: { id: "company" }, select: { currencyCode: true } }),
    getTaxDashboard(),
    prisma.complianceTask.count({ where: { status: { in: [ComplianceStatus.PENDING, ComplianceStatus.IN_PROGRESS] } } }),
    prisma.complianceTask.count({ where: { status: ComplianceStatus.COMPLETED } }),
    prisma.complianceTask.count({
      where: {
        status: { not: ComplianceStatus.COMPLETED },
        dueDate: { lt: new Date(new Date().toISOString().slice(0, 10)) },
      },
    }),
    prisma.clientTaxRecord.count(),
  ]);

  const billedByCurrency = new Map<string, Prisma.Decimal>();
  const outstandingByCurrency = new Map<string, Prisma.Decimal>();
  for (const bill of activeBills) {
    sumByCurrency(billedByCurrency, bill.currencyCode, bill.totalAmount);
    const paid = bill.payments.reduce((total, payment) => total.add(payment.amount), decimal());
    if (bill.status !== BillStatus.DRAFT) {
      sumByCurrency(outstandingByCurrency, bill.currencyCode, bill.totalAmount.sub(paid));
    }
  }
  const paymentsByCurrency = new Map<string, Prisma.Decimal>();
  for (const payment of billPayments) sumByCurrency(paymentsByCurrency, payment.bill.currencyCode, payment.amount);

  const incomeByCurrency = new Map<string, Prisma.Decimal>();
  for (const record of incomeRecords) sumByCurrency(incomeByCurrency, record.currencyCode, record.amount);
  for (const payment of standalonePayments) sumByCurrency(incomeByCurrency, payment.bill.currencyCode, payment.amount);
  for (const receipt of standaloneReceipts) sumByCurrency(incomeByCurrency, receipt.currencyCode, receipt.amount);

  const expensesByCurrency = new Map<string, Prisma.Decimal>();
  for (const record of expenseRecords) sumByCurrency(expensesByCurrency, record.currencyCode, record.amount);
  for (const voucher of standalonePaymentVouchers) sumByCurrency(expensesByCurrency, voucher.currencyCode, voucher.amount);

  const activity = [
    ...recentIncomeRecords.map((record) => ({
      id: `income:${record.id}`, reference: record.referenceNumber, date: record.incomeDate,
      party: record.clientName || "Income record", description: record.description,
      amount: record.amount.toFixed(2), currencyCode: record.currencyCode, direction: "Income" as const,
      href: `/admin/accounts/income/${record.id}`,
    })),
    ...recentBillPayments.map((payment) => ({
      id: `payment:${payment.id}`, reference: `${payment.bill.billNumber} payment`, date: payment.paymentDate,
      party: payment.bill.clientName, description: `Bill payment received`,
      amount: payment.amount.toFixed(2), currencyCode: payment.bill.currencyCode, direction: "Income" as const,
      href: `/admin/billing/${payment.bill.id}`,
    })),
    ...recentReceipts.map((receipt) => ({
      id: `receipt:${receipt.id}`, reference: receipt.voucherNumber, date: receipt.voucherDate,
      party: receipt.clientName, description: receipt.description,
      amount: receipt.amount.toFixed(2), currencyCode: receipt.currencyCode, direction: "Income" as const,
      href: `/admin/receipt-vouchers/${receipt.id}`,
    })),
    ...recentExpenses.map((record) => ({
      id: `expense:${record.id}`, reference: record.referenceNumber, date: record.expenseDate,
      party: record.paidTo, description: record.description,
      amount: record.amount.toFixed(2), currencyCode: record.currencyCode, direction: "Expense" as const,
      href: `/admin/accounts/expenses/${record.id}`,
    })),
    ...recentPaymentVouchers.map((voucher) => ({
      id: `voucher:${voucher.id}`, reference: voucher.voucherNumber, date: voucher.voucherDate,
      party: voucher.payeeName, description: voucher.purpose,
      amount: voucher.amount.toFixed(2), currencyCode: voucher.currencyCode, direction: "Expense" as const,
      href: `/admin/payment-vouchers/${voucher.id}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 12);

  return {
    ...filters,
    currencyCode: settings?.currencyCode ?? "NPR",
    billed: [...billedByCurrency].map(([currencyCode, amount]) => ({ currencyCode, amount: amount.toFixed(2) })),
    paymentsReceived: [...paymentsByCurrency].map(([currencyCode, amount]) => ({ currencyCode, amount: amount.toFixed(2) })),
    outstanding: [...outstandingByCurrency].map(([currencyCode, amount]) => ({ currencyCode, amount: amount.toFixed(2) })),
    financial: currencyRows(incomeByCurrency, expensesByCurrency),
    activity,
    tax: {
      totalRecords: taxRecordCount,
      pendingTasks: pendingCompliance,
      completedTasks: completedCompliance,
      overdueTasks: overdueCompliance,
      upcomingDeadlines: tax.upcomingDeadlines,
    },
  };
}

export async function getBillingReport(
  params: Record<string, string | string[] | undefined>,
  exportAll = false,
) {
  const filters = normalizeReportFilters(params);
  const billDate = dateWhere(filters.from, filters.to);
  const where: Prisma.BillWhereInput = {
    ...(billDate ? { billDate } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.status ? { status: filters.status as BillStatus } : {}),
  };
  const billSummaryWhere: Prisma.BillWhereInput = filters.status === BillStatus.CANCELLED || filters.status === BillStatus.DRAFT
    ? { ...where, id: "__no-active-bills__" }
    : { ...where, status: filters.status ? filters.status as BillStatus : { notIn: [BillStatus.CANCELLED, BillStatus.DRAFT] } };
  const [total, clients, summaryBills] = await Promise.all([
    prisma.bill.count({ where }),
    prisma.client.findMany({ orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
    prisma.bill.findMany({
      where: billSummaryWhere,
      select: {
        currencyCode: true,
        totalAmount: true,
        status: true,
        payments: { select: { amount: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = exportAll ? 1 : Math.min(filters.page, pages);
  const rows = await prisma.bill.findMany({
    where,
    orderBy: [{ billDate: "desc" }, { id: "desc" }],
    ...(exportAll ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    include: { payments: { select: { amount: true } } },
  });
  const billingSummary = new Map<string, { billed: Prisma.Decimal; paid: Prisma.Decimal; outstanding: Prisma.Decimal }>();
  for (const bill of summaryBills) {
    const values = billingSummary.get(bill.currencyCode) ?? { billed: decimal(), paid: decimal(), outstanding: decimal() };
    const paid = bill.payments.reduce((sum, payment) => sum.add(payment.amount), decimal());
    values.billed = values.billed.add(bill.totalAmount);
    values.paid = values.paid.add(paid);
    if (bill.status !== BillStatus.DRAFT) values.outstanding = values.outstanding.add(bill.totalAmount.sub(paid));
    billingSummary.set(bill.currencyCode, values);
  }
  return {
    ...filters,
    page,
    pages,
    total,
    clients,
    rows: rows.map((row) => {
      const paid = row.payments.reduce((sum, payment) => sum.add(payment.amount), decimal());
      const notReceivable = row.status === BillStatus.CANCELLED || row.status === BillStatus.DRAFT;
      return {
        id: row.id,
        billNumber: row.billNumber,
        billType: row.billType,
        clientName: row.clientName,
        clientId: row.clientId,
        billDate: row.billDate,
        totalAmount: row.totalAmount.toFixed(2),
        paidAmount: paid.toFixed(2),
        outstandingAmount: notReceivable ? "0.00" : row.totalAmount.sub(paid).toFixed(2),
        status: row.status,
        currencyCode: row.currencyCode,
      };
    }),
    totalsByCurrency: [...billingSummary].map(([currencyCode, totals]) => ({
      currencyCode,
      billed: totals.billed.toFixed(2),
      paid: totals.paid.toFixed(2),
      outstanding: totals.outstanding.toFixed(2),
    })),
  };
}

function reportCategoryWhere(category: string, type: "INCOME" | "EXPENSE") {
  if (!category) return {};
  if (type === "INCOME" && category === accountSystemCategoryIds.billPayments) return { system: "payments" as const };
  if (type === "INCOME" && category === accountSystemCategoryIds.clientReceipts) return { system: "receipts" as const };
  if (type === "EXPENSE" && category === accountSystemCategoryIds.paymentVouchers) return { system: "vouchers" as const };
  return { categoryId: category };
}

export async function getFinancialReport(
  params: Record<string, string | string[] | undefined>,
  exportAll = false,
) {
  const filters = normalizeReportFilters(params);
  const date = dateWhere(filters.from, filters.to);
  const incomeCategory = reportCategoryWhere(filters.category, "INCOME");
  const expenseCategory = reportCategoryWhere(filters.category, "EXPENSE");
  const incomeWhere: Prisma.IncomeRecordWhereInput = {
    ...(date ? { incomeDate: date } : {}),
    ...("categoryId" in incomeCategory ? { categoryId: incomeCategory.categoryId } : {}),
  };
  const paymentWhere: Prisma.PaymentWhereInput = {
    incomeRecord: null,
    ...(date ? { paymentDate: date } : {}),
    ...(!filters.category || incomeCategory.system === "payments" ? {} : { id: "__no-category-match__" }),
  };
  const receiptWhere: Prisma.ReceiptVoucherWhereInput = {
    incomeRecord: null,
    ...(date ? { voucherDate: date } : {}),
    ...(!filters.category || incomeCategory.system === "receipts" ? {} : { id: "__no-category-match__" }),
  };
  const expenseWhere: Prisma.ExpenseRecordWhereInput = {
    ...(date ? { expenseDate: date } : {}),
    ...("categoryId" in expenseCategory ? { categoryId: expenseCategory.categoryId } : {}),
  };
  const voucherWhere: Prisma.PaymentVoucherWhereInput = {
    expenseRecord: null,
    ...(date ? { voucherDate: date } : {}),
    ...(!filters.category || expenseCategory.system === "vouchers" ? {} : { id: "__no-category-match__" }),
  };
  const [incomeRecords, payments, receipts, expenses, vouchers, categoryOptions] = await Promise.all([
    prisma.incomeRecord.findMany({
      where: incomeWhere, orderBy: [{ incomeDate: "desc" }, { id: "desc" }],
      include: { category: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: paymentWhere, orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
      include: { bill: { select: { billNumber: true, clientName: true, currencyCode: true } } },
    }),
    prisma.receiptVoucher.findMany({
      where: receiptWhere, orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
      select: { id: true, voucherNumber: true, voucherDate: true, amount: true, currencyCode: true, clientName: true, description: true },
    }),
    prisma.expenseRecord.findMany({
      where: expenseWhere, orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
      include: { category: { select: { name: true } } },
    }),
    prisma.paymentVoucher.findMany({
      where: voucherWhere, orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
      select: { id: true, voucherNumber: true, voucherDate: true, amount: true, currencyCode: true, payeeName: true, purpose: true },
    }),
    prisma.accountCategory.findMany({
      where: { type: { in: [AccountCategoryType.INCOME, AccountCategoryType.EXPENSE] } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    }),
  ]);

  const transactionRows = [
    ...incomeRecords.map((record) => ({
      id: `income:${record.id}`, date: record.incomeDate, reference: record.referenceNumber,
      party: record.clientName || "—", category: record.category.name, type: "Income" as const,
      amount: record.amount.toFixed(2), currencyCode: record.currencyCode,
    })),
    ...payments.map((payment) => ({
      id: `payment:${payment.id}`, date: payment.paymentDate, reference: `${payment.bill.billNumber} payment`,
      party: payment.bill.clientName, category: "Bill payments", type: "Income" as const,
      amount: payment.amount.toFixed(2), currencyCode: payment.bill.currencyCode,
    })),
    ...receipts.map((receipt) => ({
      id: `receipt:${receipt.id}`, date: receipt.voucherDate, reference: receipt.voucherNumber,
      party: receipt.clientName, category: "Client receipts", type: "Income" as const,
      amount: receipt.amount.toFixed(2), currencyCode: receipt.currencyCode,
    })),
    ...expenses.map((record) => ({
      id: `expense:${record.id}`, date: record.expenseDate, reference: record.referenceNumber,
      party: record.paidTo, category: record.category.name, type: "Expense" as const,
      amount: record.amount.toFixed(2), currencyCode: record.currencyCode,
    })),
    ...vouchers.map((voucher) => ({
      id: `voucher:${voucher.id}`, date: voucher.voucherDate, reference: voucher.voucherNumber,
      party: voucher.payeeName, category: "Payment vouchers", type: "Expense" as const,
      amount: voucher.amount.toFixed(2), currencyCode: voucher.currencyCode,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime() || a.reference.localeCompare(b.reference));

  const incomeByCurrency = new Map<string, Prisma.Decimal>();
  const expensesByCurrency = new Map<string, Prisma.Decimal>();
  const incomeByCategory = new Map<string, Prisma.Decimal>();
  const expensesByCategory = new Map<string, Prisma.Decimal>();
  for (const row of transactionRows) {
    const amount = new Prisma.Decimal(row.amount);
    if (row.type === "Income") {
      sumByCurrency(incomeByCurrency, row.currencyCode, amount);
      incomeByCategory.set(`${row.category}\u0000${row.currencyCode}`, (incomeByCategory.get(`${row.category}\u0000${row.currencyCode}`) ?? decimal()).add(amount));
    } else {
      sumByCurrency(expensesByCurrency, row.currencyCode, amount);
      expensesByCategory.set(`${row.category}\u0000${row.currencyCode}`, (expensesByCategory.get(`${row.category}\u0000${row.currencyCode}`) ?? decimal()).add(amount));
    }
  }
  const currencies = currencyRows(incomeByCurrency, expensesByCurrency);
  const activityTotal = transactionRows.length;
  const pages = Math.max(1, Math.ceil(activityTotal / pageSize));
  const page = exportAll ? 1 : Math.min(filters.page, pages);
  const categories = [
    ...categoryOptions.map((option) => ({ id: option.id, name: option.name, type: option.type })),
    { id: accountSystemCategoryIds.billPayments, name: "Bill payments", type: AccountCategoryType.INCOME },
    { id: accountSystemCategoryIds.clientReceipts, name: "Client receipts", type: AccountCategoryType.INCOME },
    { id: accountSystemCategoryIds.paymentVouchers, name: "Payment vouchers", type: AccountCategoryType.EXPENSE },
  ];

  return {
    ...filters,
    page,
    pages,
    total: activityTotal,
    transactions: exportAll ? transactionRows : transactionRows.slice((page - 1) * pageSize, page * pageSize),
    currencies,
    incomeByCategory: [...incomeByCategory].map(([key, amount]) => {
      const [category, currencyCode] = key.split("\u0000");
      return { category, currencyCode, amount: amount.toFixed(2) };
    }),
    expensesByCategory: [...expensesByCategory].map(([key, amount]) => {
      const [category, currencyCode] = key.split("\u0000");
      return { category, currencyCode, amount: amount.toFixed(2) };
    }),
    categories,
  };
}

export async function getClientReport(
  params: Record<string, string | string[] | undefined>,
  exportAll = false,
) {
  const filters = normalizeReportFilters(params);
  const where: Prisma.ClientWhereInput = filters.q
    ? { displayName: { contains: filters.q, mode: "insensitive" } }
    : {};
  const [total, active, inactive] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.count({ where: { ...where, isActive: true } }),
    prisma.client.count({ where: { ...where, isActive: false } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = exportAll ? 1 : Math.min(filters.page, pages);
  const clients = await prisma.client.findMany({
    where,
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
    ...(exportAll ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    select: {
      id: true,
      displayName: true,
      isActive: true,
      bills: {
        where: {
          status: { notIn: [BillStatus.CANCELLED, BillStatus.DRAFT] },
          ...(dateWhere(filters.from, filters.to) ? { billDate: dateWhere(filters.from, filters.to) } : {}),
        },
        select: {
          totalAmount: true,
          currencyCode: true,
          status: true,
          payments: { select: { amount: true } },
        },
      },
      receiptVouchers: {
        where: dateWhere(filters.from, filters.to) ? { voucherDate: dateWhere(filters.from, filters.to) } : {},
        select: { amount: true, currencyCode: true },
      },
    },
  });
  return {
    ...filters,
    page: exportAll ? 1 : Math.min(page, pages),
    pages,
    total,
    active,
    inactive,
    clients: clients.map((client) => {
      const billed = new Map<string, Prisma.Decimal>();
      const paid = new Map<string, Prisma.Decimal>();
      const receipts = new Map<string, Prisma.Decimal>();
      const outstanding = new Map<string, Prisma.Decimal>();
      for (const bill of client.bills) {
        const billPaid = bill.payments.reduce((sum, payment) => sum.add(payment.amount), decimal());
        sumByCurrency(billed, bill.currencyCode, bill.totalAmount);
        sumByCurrency(paid, bill.currencyCode, billPaid);
        if (bill.status !== BillStatus.DRAFT) {
          sumByCurrency(outstanding, bill.currencyCode, bill.totalAmount.sub(billPaid));
        }
      }
      for (const receipt of client.receiptVouchers) {
        sumByCurrency(receipts, receipt.currencyCode, receipt.amount);
      }
      const asString = (values: Map<string, Prisma.Decimal>) =>
        [...values].map(([currencyCode, amount]) => ({ currencyCode, amount: amount.toFixed(2) }));
      return {
        id: client.id,
        displayName: client.displayName,
        isActive: client.isActive,
        billed: asString(billed),
        paid: asString(paid),
        receipts: asString(receipts),
        outstanding: asString(outstanding),
      };
    }),
  };
}

export async function getTaxReport(params: Record<string, string | string[] | undefined>) {
  const filters = normalizeReportFilters(params);
  const today = new Date(new Date().toISOString().slice(0, 10));
  const [taxRecords, pendingTasks, completedTasks, overdueTasks, upcomingTasks, overdueTaskRows, upcomingTaxRecords, overdueTaxRecords] = await Promise.all([
    prisma.clientTaxRecord.count(),
    prisma.complianceTask.count({ where: { status: { in: [ComplianceStatus.PENDING, ComplianceStatus.IN_PROGRESS] } } }),
    prisma.complianceTask.count({ where: { status: ComplianceStatus.COMPLETED } }),
    prisma.complianceTask.count({ where: { status: { not: ComplianceStatus.COMPLETED }, dueDate: { lt: today } } }),
    prisma.complianceTask.findMany({
      where: { status: { not: ComplianceStatus.COMPLETED }, dueDate: { gte: today } },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      include: { client: { select: { displayName: true } } },
    }),
    prisma.complianceTask.findMany({
      where: { status: { not: ComplianceStatus.COMPLETED }, dueDate: { lt: today } },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      include: { client: { select: { displayName: true } } },
    }),
    prisma.clientTaxRecord.findMany({
      where: { filingStatus: { not: TaxFilingStatus.FILED }, dueDate: { gte: today } },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      include: { client: { select: { id: true, displayName: true } } },
    }),
    prisma.clientTaxRecord.findMany({
      where: { filingStatus: { not: TaxFilingStatus.FILED }, dueDate: { lt: today } },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      include: { client: { select: { id: true, displayName: true } } },
    }),
  ]);
  const from = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : today;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : null;
  const selectedDeadlines = [
    ...upcomingTasks
      .filter((task) => task.dueDate >= from && (!to || task.dueDate <= to))
      .map((task) => ({ ...task, href: `/admin/tax/compliance/${task.id}`, kind: "Compliance task" })),
    ...upcomingTaxRecords
      .filter((record) => record.dueDate && record.dueDate >= from && (!to || record.dueDate <= to))
      .map((record) => ({
        id: record.id,
        title: `${record.taxType} · ${record.taxPeriod}`,
        dueDate: record.dueDate!,
        category: "Tax record",
        status: record.filingStatus,
        client: record.client,
        href: `/admin/tax/records/${record.id}`,
        kind: "Tax record",
      })),
  ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const selectedOverdue = [
    ...overdueTaskRows
      .filter((task) => (!filters.from || task.dueDate >= from) && (!to || task.dueDate <= to))
      .map((task) => ({ ...task, href: `/admin/tax/compliance/${task.id}`, kind: "Compliance task" })),
    ...overdueTaxRecords
      .filter((record) => record.dueDate && (!filters.from || record.dueDate >= from) && (!to || record.dueDate <= to))
      .map((record) => ({
        id: record.id,
        title: `${record.taxType} · ${record.taxPeriod}`,
        dueDate: record.dueDate!,
        category: "Tax record",
        status: record.filingStatus,
        client: record.client,
        href: `/admin/tax/records/${record.id}`,
        kind: "Tax record",
      })),
  ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return {
    ...filters,
    taxRecords,
    pendingTasks,
    completedTasks,
    overdueTasks,
    upcomingDeadlines: selectedDeadlines,
    overdueRows: selectedOverdue,
  };
}
