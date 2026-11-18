import "server-only";

import { prisma } from "@/lib/prisma";

const pageSize = 20;

function paginationParams(params: Record<string, string | string[] | undefined>) {
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const requested = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  return { q, page: Number.isSafeInteger(requested) && requested > 0 ? requested : 1 };
}

export async function listReceiptVouchers(params: Record<string, string | string[] | undefined>) {
  const { q, page } = paginationParams(params);
  const where = q ? {
    OR: [
      { voucherNumber: { contains: q, mode: "insensitive" as const } },
      { clientName: { contains: q, mode: "insensitive" as const } },
    ],
  } : {};
  const [total, records] = await prisma.$transaction([
    prisma.receiptVoucher.count({ where }),
    prisma.receiptVoucher.findMany({
      where,
      orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        voucherNumber: true,
        clientName: true,
        voucherDate: true,
        amount: true,
        currencyCode: true,
        method: true,
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return {
    q,
    page: Math.min(page, pages),
    pages,
    total,
    entries: records.map((record) => ({
      id: record.id,
      number: record.voucherNumber,
      party: record.clientName,
      date: record.voucherDate,
      amount: record.amount.toFixed(2),
      currencyCode: record.currencyCode,
      method: record.method,
    })),
  };
}

export async function listPaymentVouchers(params: Record<string, string | string[] | undefined>) {
  const { q, page } = paginationParams(params);
  const where = q ? {
    OR: [
      { voucherNumber: { contains: q, mode: "insensitive" as const } },
      { payeeName: { contains: q, mode: "insensitive" as const } },
    ],
  } : {};
  const [total, records] = await prisma.$transaction([
    prisma.paymentVoucher.count({ where }),
    prisma.paymentVoucher.findMany({
      where,
      orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        voucherNumber: true,
        payeeName: true,
        voucherDate: true,
        amount: true,
        currencyCode: true,
        method: true,
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return {
    q,
    page: Math.min(page, pages),
    pages,
    total,
    entries: records.map((record) => ({
      id: record.id,
      number: record.voucherNumber,
      party: record.payeeName,
      date: record.voucherDate,
      amount: record.amount.toFixed(2),
      currencyCode: record.currencyCode,
      method: record.method,
    })),
  };
}

export async function getReceiptVoucherEditData(id: string) {
  const [voucher, clients] = await prisma.$transaction([
    prisma.receiptVoucher.findUnique({ where: { id } }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
  ]);
  if (!voucher) return null;
  const currentClient = await prisma.client.findUnique({
    where: { id: voucher.clientId },
    select: { id: true, displayName: true, isActive: true },
  });
  if (currentClient && !clients.some((client) => client.id === currentClient.id)) {
    clients.push({ id: currentClient.id, displayName: `${currentClient.displayName} (inactive)` });
  }
  return { voucher, clients };
}

export function getPaymentVoucher(id: string) {
  return prisma.paymentVoucher.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, email: true } } },
  });
}

export function getReceiptVoucher(id: string) {
  return prisma.receiptVoucher.findUnique({
    where: { id },
    include: {
      client: { select: { displayName: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
}
