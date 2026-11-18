import "server-only";

import { BillStatus, BillType, Prisma } from "@prisma/client";
import { getBillDisplayStatus, moneyToCents } from "@/lib/admin/billing";
import { prisma } from "@/lib/prisma";

export async function listDetailsBills(params: {
  q: string;
  status: string;
  page: number;
}) {
  const where: Prisma.BillWhereInput = { billType: BillType.DETAILS };
  if (params.q) {
    where.OR = [
      { billNumber: { contains: params.q, mode: "insensitive" } },
      { clientName: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.status === "OVERDUE") {
    const now = new Date();
    where.status = { in: [BillStatus.ISSUED, BillStatus.PARTIALLY_PAID] };
    where.dueDate = { lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) };
  } else if (Object.values(BillStatus).includes(params.status as BillStatus)) {
    where.status = params.status as BillStatus;
  }
  const pageSize = 20;
  const [total, bills] = await prisma.$transaction([
    prisma.bill.count({ where }),
    prisma.bill.findMany({
      where,
      orderBy: [{ billDate: "desc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * pageSize,
      take: pageSize,
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
  const now = new Date();
  return {
    total,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    bills: bills.map((bill) => {
      const paid = bill.payments.reduce(
        (sum, payment) => sum.add(payment.amount),
        new Prisma.Decimal(0),
      );
      return {
        ...bill,
        displayStatus: getBillDisplayStatus(
          bill.status,
          bill.dueDate,
          moneyToCents(bill.totalAmount.sub(paid).toFixed(2)),
          now,
        ),
      };
    }),
  };
}

export async function getDetailsBillForEdit(id: string) {
  const [bill, clients] = await prisma.$transaction([
    prisma.bill.findUnique({
      where: { id, billType: BillType.DETAILS },
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
    clients.push({ ...currentClient, displayName: `${currentClient.displayName} (inactive)` });
  }
  return { bill, clients };
}
