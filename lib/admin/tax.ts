import "server-only";

import { ComplianceStatus, Prisma, TaxFilingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const pageSize = 20;

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeTaxFilters(params: Record<string, string | string[] | undefined>) {
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const rawPage = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 500) : 1;
  const statusValue = typeof params.status === "string" ? params.status : "";
  const filingStatus: TaxFilingStatus | "" = Object.values(TaxFilingStatus).includes(statusValue as TaxFilingStatus)
    ? statusValue as TaxFilingStatus
    : "";
  return { q, page, filingStatus };
}

export function normalizeComplianceFilters(params: Record<string, string | string[] | undefined>) {
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const rawPage = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 500) : 1;
  const statusValue = typeof params.status === "string" ? params.status : "";
  const status: ComplianceStatus | "OVERDUE" | "open" | "" = statusValue === "OVERDUE" || statusValue === "open"
    ? statusValue
    : Object.values(ComplianceStatus).includes(statusValue as ComplianceStatus)
    ? statusValue as ComplianceStatus
    : "";
  const category = typeof params.category === "string" ? params.category.trim().slice(0, 100) : "";
  return { q, page, status, category };
}

export async function getTaxFormData(recordId?: string) {
  const [clients, documents, record] = await Promise.all([
    prisma.client.findMany({
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, panNumber: true, vatRegistered: true, vatNumber: true },
    }),
    prisma.document.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      select: { id: true, title: true, clientId: true, originalName: true },
    }),
    recordId
      ? prisma.clientTaxRecord.findUnique({
          where: { id: recordId },
          include: { documents: { select: { documentId: true } } },
        })
      : null,
  ]);
  if (recordId && !record) return null;
  return {
    clients,
    documents,
    initial: record
      ? {
          clientId: record.clientId,
          taxPeriod: record.taxPeriod,
          taxType: record.taxType,
          filingStatus: record.filingStatus,
          filingDate: record.filingDate?.toISOString().slice(0, 10) ?? "",
          dueDate: record.dueDate?.toISOString().slice(0, 10) ?? "",
          notes: record.notes ?? "",
          documentIds: record.documents.map((item) => item.documentId),
        }
      : undefined,
  };
}

export async function getComplianceFormData(taskId?: string) {
  const [clients, documents, staff, task] = await Promise.all([
    prisma.client.findMany({
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
    prisma.document.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      select: { id: true, title: true, clientId: true, originalName: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { name: "ADMIN" } },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
    }),
    taskId
      ? prisma.complianceTask.findUnique({
          where: { id: taskId },
          include: { documents: { select: { documentId: true } } },
        })
      : null,
  ]);
  if (taskId && !task) return null;
  return {
    clients,
    documents,
    staff,
    initial: task
      ? {
          title: task.title,
          clientId: task.clientId ?? "",
          category: task.category,
          description: task.description ?? "",
          dueDate: task.dueDate.toISOString().slice(0, 10),
          assignedToId: task.assignedToId ?? "",
          status: task.status,
          completedAt: task.completedAt?.toISOString().slice(0, 10) ?? "",
          notes: task.notes ?? "",
          documentIds: task.documents.map((item) => item.documentId),
        }
      : undefined,
  };
}

export async function listTaxRecords(params: Record<string, string | string[] | undefined>) {
  const filters = normalizeTaxFilters(params);
  const where: Prisma.ClientTaxRecordWhereInput = {
    ...(filters.filingStatus ? { filingStatus: filters.filingStatus } : {}),
    ...(filters.q
      ? {
          OR: [
            { taxType: { contains: filters.q, mode: "insensitive" } },
            { taxPeriod: { contains: filters.q, mode: "insensitive" } },
            { panNumber: { contains: filters.q, mode: "insensitive" } },
            { client: { displayName: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const total = await prisma.clientTaxRecord.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pages);
  const records = await prisma.clientTaxRecord.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { client: { select: { id: true, displayName: true } } },
  });
  return { ...filters, page, pages, total, records };
}

export async function listComplianceTasks(params: Record<string, string | string[] | undefined>) {
  const filters = normalizeComplianceFilters(params);
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const where: Prisma.ComplianceTaskWhereInput = {
    ...(filters.status === "open"
      ? { status: { in: [ComplianceStatus.PENDING, ComplianceStatus.IN_PROGRESS] } }
      : filters.status === "OVERDUE"
      ? { status: { not: ComplianceStatus.COMPLETED }, dueDate: { lt: start } }
      : filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { category: { equals: filters.category, mode: "insensitive" } } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { category: { contains: filters.q, mode: "insensitive" } },
            { client: { displayName: { contains: filters.q, mode: "insensitive" } } },
            { assignedTo: { name: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, categories] = await prisma.$transaction([
    prisma.complianceTask.count({ where }),
    prisma.complianceTask.findMany({
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pages);
  const tasks = await prisma.complianceTask.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      client: { select: { id: true, displayName: true } },
      assignedTo: { select: { name: true, email: true } },
    },
  });
  return { ...filters, page, pages, total, categories: categories.map((item) => item.category), tasks };
}

export function getTaxRecord(id: string) {
  return prisma.clientTaxRecord.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true } },
      documents: { include: { document: { select: { id: true, title: true, originalName: true } } } },
    },
  });
}

export function getComplianceTask(id: string) {
  return prisma.complianceTask.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true } },
      assignedTo: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      documents: { include: { document: { select: { id: true, title: true, originalName: true } } } },
    },
  });
}

export async function getTaxDashboard() {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dueSoon = new Date(start);
  dueSoon.setUTCDate(dueSoon.getUTCDate() + 7);
  const upcomingLimit = new Date(start);
  upcomingLimit.setUTCDate(upcomingLimit.getUTCDate() + 30);
  const [taxRecordCount, pendingTaskCount, inProgressTaskCount, completedTaskCount, overdueTaskCount, overdueRecordCount, overdueTasks, dueSoonTasks, upcomingTasks, dueSoonRecords, overdueRecords] =
    await prisma.$transaction([
      prisma.clientTaxRecord.count(),
      prisma.complianceTask.count({ where: { status: ComplianceStatus.PENDING } }),
      prisma.complianceTask.count({ where: { status: ComplianceStatus.IN_PROGRESS } }),
      prisma.complianceTask.count({ where: { status: ComplianceStatus.COMPLETED } }),
      prisma.complianceTask.count({
        where: { status: { not: ComplianceStatus.COMPLETED }, dueDate: { lt: start } },
      }),
      prisma.clientTaxRecord.count({
        where: { filingStatus: { not: TaxFilingStatus.FILED }, dueDate: { lt: start } },
      }),
      prisma.complianceTask.findMany({
        where: { status: { not: ComplianceStatus.COMPLETED }, dueDate: { lt: start } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { client: { select: { displayName: true } } },
      }),
      prisma.complianceTask.findMany({
        where: { status: { not: ComplianceStatus.COMPLETED }, dueDate: { gte: start, lte: dueSoon } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { client: { select: { displayName: true } } },
      }),
      prisma.complianceTask.findMany({
        where: { status: { not: ComplianceStatus.COMPLETED }, dueDate: { gt: dueSoon, lte: upcomingLimit } },
        orderBy: { dueDate: "asc" },
        take: 10,
        include: { client: { select: { displayName: true } } },
      }),
      prisma.clientTaxRecord.findMany({
        where: { filingStatus: { not: TaxFilingStatus.FILED }, dueDate: { gte: start, lte: dueSoon } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { client: { select: { displayName: true } } },
      }),
      prisma.clientTaxRecord.findMany({
        where: { filingStatus: { not: TaxFilingStatus.FILED }, dueDate: { lt: start } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { client: { select: { displayName: true } } },
      }),
    ]);
  const deadlineRows = [
    ...overdueTasks.map((task) => ({
      id: `task:${task.id}`, href: `/admin/tax/compliance/${task.id}`, title: task.title,
      party: task.client?.displayName ?? "Company", dueDate: task.dueDate, kind: "Compliance task", state: "overdue",
    })),
    ...dueSoonTasks.map((task) => ({
      id: `task:${task.id}`, href: `/admin/tax/compliance/${task.id}`, title: task.title,
      party: task.client?.displayName ?? "Company", dueDate: task.dueDate, kind: "Compliance task", state: "due-soon",
    })),
    ...upcomingTasks.map((task) => ({
      id: `task:${task.id}`, href: `/admin/tax/compliance/${task.id}`, title: task.title,
      party: task.client?.displayName ?? "Company", dueDate: task.dueDate, kind: "Compliance task", state: "upcoming",
    })),
    ...dueSoonRecords.map((record) => ({
      id: `record:${record.id}`, href: `/admin/tax/records/${record.id}`, title: `${record.taxType} · ${record.taxPeriod}`,
      party: record.client.displayName, dueDate: record.dueDate!, kind: "Tax record", state: "due-soon",
    })),
    ...overdueRecords.map((record) => ({
      id: `record:${record.id}`, href: `/admin/tax/records/${record.id}`, title: `${record.taxType} · ${record.taxPeriod}`,
      party: record.client.displayName, dueDate: record.dueDate!, kind: "Tax record", state: "overdue",
    })),
  ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const upcomingDeadlines = deadlineRows.filter((item) => item.state !== "overdue").slice(0, 10);
  const overdueDeadlines = deadlineRows.filter((item) => item.state === "overdue");
  return {
    totalTaxRecords: taxRecordCount,
    pendingTasks: pendingTaskCount + inProgressTaskCount,
    inProgressTasks: inProgressTaskCount,
    completedTasks: completedTaskCount,
    overdueCount: overdueTaskCount + overdueRecordCount,
    upcomingDeadlines,
    overdueDeadlines,
    dueSoon,
    today: start,
  };
}

export function dueDateState(dueDate: Date, status: ComplianceStatus | TaxFilingStatus) {
  if (status === ComplianceStatus.COMPLETED || status === TaxFilingStatus.FILED) return "completed";
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (dueDate < start) return "overdue";
  const soon = new Date(start);
  soon.setUTCDate(soon.getUTCDate() + 7);
  return dueDate <= soon ? "due-soon" : "upcoming";
}

export function isDocumentForClient(
  document: { clientId: string | null },
  clientId: string | null,
) {
  return !document.clientId || document.clientId === clientId;
}
