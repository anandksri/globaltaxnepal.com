import "server-only";

import { DocumentCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const pageSize = 20;

export const documentCategories = [
  { value: DocumentCategory.PAN_CERTIFICATE, label: "PAN certificate" },
  { value: DocumentCategory.VAT_CERTIFICATE, label: "VAT certificate" },
  { value: DocumentCategory.COMPANY_REGISTRATION, label: "Company registration" },
  { value: DocumentCategory.TAX_CLEARANCE, label: "Tax clearance" },
  { value: DocumentCategory.CLIENT_IDENTIFICATION, label: "Client identification" },
  { value: DocumentCategory.BILL_INVOICE, label: "Bill or invoice" },
  { value: DocumentCategory.RECEIPT_VOUCHER, label: "Receipt voucher" },
  { value: DocumentCategory.PAYMENT_VOUCHER, label: "Payment voucher" },
  { value: DocumentCategory.AGREEMENT, label: "Agreement" },
  { value: DocumentCategory.SUPPORTING_DOCUMENT, label: "Supporting document" },
  { value: DocumentCategory.OTHER, label: "Other" },
] as const;

export function documentCategoryLabel(category: DocumentCategory) {
  return documentCategories.find((item) => item.value === category)?.label ?? "Other";
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeDocumentFilters(
  params: Record<string, string | string[] | undefined>,
) {
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const pageInput = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const page = Number.isSafeInteger(pageInput) && pageInput > 0 ? Math.min(pageInput, 500) : 1;
  const fromValue = typeof params.from === "string" ? params.from : "";
  const toValue = typeof params.to === "string" ? params.to : "";
  const from = isValidDate(fromValue) ? fromValue : "";
  const to = isValidDate(toValue) ? toValue : "";
  const categoryValue = typeof params.category === "string" ? params.category : "";
  const category: DocumentCategory | "" = Object.values(DocumentCategory).includes(categoryValue as DocumentCategory)
    ? categoryValue as DocumentCategory
    : "";
  const clientId = typeof params.client === "string" ? params.client.trim().slice(0, 191) : "";
  return {
    q,
    page,
    category,
    clientId,
    from: from && to && from > to ? to : from,
    to: from && to && from > to ? from : to,
  };
}

export async function listDocuments(
  params: Record<string, string | string[] | undefined>,
) {
  const filters = normalizeDocumentFilters(params);
  const createdAt = {
    ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
    ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
  };
  const where: Prisma.DocumentWhereInput = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { originalName: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
            { client: { displayName: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, totalDocuments, categoryCounts, clients, recentUploads] = await prisma.$transaction([
    prisma.document.count({ where }),
    prisma.document.count(),
    prisma.document.groupBy({
      by: ["category"],
      orderBy: { category: "asc" },
      _count: { category: true },
    }),
    prisma.client.findMany({
      where: { documents: { some: {} } },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
    prisma.document.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
        client: { select: { id: true, displayName: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pages);
  const categoryCountMap = new Map<DocumentCategory, number>();
  for (const item of categoryCounts) {
    const count = item._count;
    categoryCountMap.set(
      item.category,
      typeof count === "object" && count !== null && "category" in count && typeof count.category === "number"
        ? count.category
        : 0,
    );
  }
  const documents = await prisma.document.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      title: true,
      category: true,
      originalName: true,
      mimeType: true,
      fileSize: true,
      createdAt: true,
      client: { select: { id: true, displayName: true } },
    },
  });
  return {
    ...filters,
    page,
    pages,
    total,
    totalDocuments,
    categories: documentCategories.map((category) => ({
      ...category,
      count: categoryCountMap.get(category.value) ?? 0,
    })),
    clients,
    recentUploads,
    documents,
  };
}

export function getDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true } },
      uploadedBy: { select: { name: true, email: true } },
    },
  });
}

export async function getDocumentEditData(id: string) {
  const [document, clients] = await prisma.$transaction([
    prisma.document.findUnique({ where: { id } }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
  ]);
  if (!document) return null;
  if (document.clientId && !clients.some((client) => client.id === document.clientId)) {
    const currentClient = await prisma.client.findUnique({
      where: { id: document.clientId },
      select: { id: true, displayName: true },
    });
    if (currentClient) clients.push(currentClient);
  }
  return { document, clients };
}
