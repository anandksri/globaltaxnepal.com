import "server-only";

import { BillStatus, Prisma } from "@prisma/client";
import { getBillDisplayStatus, moneyToCents } from "@/lib/admin/billing";
import { prisma } from "@/lib/prisma";

export const billsPerPage = 20;

export type BillFilters = {
  query: string;
  status: string;
  from: string;
  to: string;
  page: number;
};

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeBillFilters(params: Record<string, string | string[] | undefined>): BillFilters {
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const requestedPage = Number.parseInt(value("page"), 10);
  return {
    query: value("q").trim().slice(0, 100),
    status: value("status"),
    from: isDate(value("from")) ? value("from") : "",
    to: isDate(value("to")) ? value("to") : "",
    page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

function baseWhere(filters: BillFilters, today: Date): Prisma.BillWhereInput {
  const where: Prisma.BillWhereInput = { billType: "NORMAL" };
  if (filters.query) {
    where.OR = [
      { billNumber: { contains: filters.query, mode: "insensitive" } },
      { clientName: { contains: filters.query, mode: "insensitive" } },
    ];
  }
  if (filters.from || filters.to) {
    where.billDate = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
    };
  }
  if (filters.status === "OVERDUE") {
    where.status = { in: [BillStatus.ISSUED, BillStatus.PARTIALLY_PAID] };
    where.dueDate = { lt: today };
  } else if (Object.values(BillStatus).includes(filters.status as BillStatus)) {
    where.status = filters.status as BillStatus;
  }
  return where;
}

export async function listBills(filters: BillFilters) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const where = baseWhere(filters, today);
  const [total, bills] = await prisma.$transaction([
    prisma.bill.count({ where }),
    prisma.bill.findMany({
      where,
      orderBy: [{ billDate: "desc" }, { createdAt: "desc" }],
      skip: (filters.page - 1) * billsPerPage,
      take: billsPerPage,
      select: {
        id: true,
        billNumber: true,
        clientName: true,
        billDate: true,
        dueDate: true,
        status: true,
        currencyCode: true,
        totalAmount: true,
        payments: { select: { amount: true } },
      },
    }),
  ]);
  return {
    total,
    pages: Math.max(1, Math.ceil(total / billsPerPage)),
    bills: bills.map((bill) => {
      const paid = bill.payments.reduce(
        (sum, payment) => sum.add(payment.amount),
        new Prisma.Decimal(0),
      );
      const outstanding = bill.totalAmount.sub(paid);
      return {
        ...bill,
        paidAmount: paid.toFixed(2),
        outstandingAmount: outstanding.toFixed(2),
        displayStatus: getBillDisplayStatus(
          bill.status,
          bill.dueDate,
          moneyToCents(outstanding.toFixed(2)),
          now,
        ),
      };
    }),
  };
}

export async function getBillingSummary() {
  const openStatuses = { in: [BillStatus.ISSUED, BillStatus.PARTIALLY_PAID] };
  const normalBills = { billType: "NORMAL" as const };
  const [draftCount, issuedCount, paidCount, billedTotals, paymentTotals] = await prisma.$transaction([
    prisma.bill.count({ where: { ...normalBills, status: BillStatus.DRAFT } }),
    prisma.bill.count({ where: { ...normalBills, status: openStatuses } }),
    prisma.bill.count({ where: { ...normalBills, status: BillStatus.PAID } }),
    prisma.bill.aggregate({
      where: { ...normalBills, status: openStatuses },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { bill: { ...normalBills, status: openStatuses } },
      _sum: { amount: true },
    }),
  ]);
  const billed = billedTotals._sum.totalAmount ?? new Prisma.Decimal(0);
  const paid = paymentTotals._sum.amount ?? new Prisma.Decimal(0);
  const outstandingCents = moneyToCents(billed.sub(paid).toFixed(2));
  return { draftCount, issuedCount, paidCount, outstandingCents };
}

export async function getBillDetail(id: string) {
  return prisma.bill.findUnique({
    where: { id, billType: "NORMAL" },
    include: {
      items: { orderBy: { position: "asc" } },
      payments: {
        orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
        include: { receivedBy: { select: { name: true, email: true } } },
      },
      createdBy: { select: { name: true, email: true } },
    },
  });
}

export async function getBillEditData(id: string) {
  const [bill, clients] = await prisma.$transaction([
    prisma.bill.findUnique({
      where: { id, billType: "NORMAL" },
      include: { items: { orderBy: { position: "asc" } } },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        contactPerson: true,
        phone: true,
        email: true,
        panNumber: true,
        vatRegistered: true,
        vatNumber: true,
        province: true,
        district: true,
        municipality: true,
        wardNumber: true,
        streetAddress: true,
        address: true,
      },
    }),
  ]);
  if (!bill) return null;
  const currentClient = await prisma.client.findUnique({
    where: { id: bill.clientId },
    select: {
      id: true,
      displayName: true,
      contactPerson: true,
      phone: true,
      email: true,
      panNumber: true,
      vatRegistered: true,
      vatNumber: true,
      province: true,
      district: true,
      municipality: true,
      wardNumber: true,
      streetAddress: true,
      address: true,
      isActive: true,
    },
  });
  if (currentClient && !clients.some((client) => client.id === currentClient.id)) {
    clients.push({
      ...currentClient,
      displayName: `${currentClient.displayName} (inactive)`,
    });
  }
  return { bill, clients };
}
