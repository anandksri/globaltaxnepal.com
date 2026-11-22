"use server";

import { ComplianceStatus, Prisma, TaxFilingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { isDocumentForClient } from "@/lib/admin/tax";
import { prisma } from "@/lib/prisma";

export type TaxActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const optionalDate = z.union([
  z.literal(""),
  z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid date."),
]);
const requiredDate = optionalDate.refine((value) => value !== "", "Enter a due date.");
const taxRecordSchema = z.object({
  clientId: z.string().trim().min(1, "Select a client.").max(191),
  taxPeriod: z.string().trim().min(1, "Enter a tax period.").max(100),
  taxType: z.string().trim().min(1, "Enter a tax type.").max(100),
  filingStatus: z.nativeEnum(TaxFilingStatus),
  filingDate: optionalDate,
  dueDate: optionalDate,
  notes: z.string().trim().max(5000),
  documentIds: z.array(z.string().trim().min(1).max(191)).max(30),
});
const complianceSchema = z.object({
  title: z.string().trim().min(1, "Enter a task title.").max(200),
  clientId: z.string().trim().max(191),
  category: z.string().trim().min(1, "Enter a compliance category.").max(100),
  description: z.string().trim().max(1000),
  dueDate: requiredDate,
  assignedToId: z.string().trim().max(191),
  status: z.nativeEnum(ComplianceStatus),
  completedAt: optionalDate,
  notes: z.string().trim().max(5000),
  documentIds: z.array(z.string().trim().min(1).max(191)).max(30),
});

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !result[key]) result[key] = issue.message;
  }
  return result;
}

function optionalDateValue(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function readRecord(formData: FormData) {
  return taxRecordSchema.safeParse({
    clientId: formData.get("clientId"),
    taxPeriod: formData.get("taxPeriod"),
    taxType: formData.get("taxType"),
    filingStatus: formData.get("filingStatus"),
    filingDate: formData.get("filingDate") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    notes: formData.get("notes") ?? "",
    documentIds: formData.getAll("documentIds"),
  });
}

function readTask(formData: FormData) {
  return complianceSchema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId") ?? "",
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    dueDate: formData.get("dueDate"),
    assignedToId: formData.get("assignedToId") ?? "",
    status: formData.get("status"),
    completedAt: formData.get("completedAt") ?? "",
    notes: formData.get("notes") ?? "",
    documentIds: formData.getAll("documentIds"),
  });
}

async function validateDocuments(
  transaction: Prisma.TransactionClient,
  ids: string[],
  clientId: string | null,
) {
  const uniqueIds = [...new Set(ids)];
  const documents = await transaction.document.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, clientId: true },
  });
  return documents.length === uniqueIds.length &&
    documents.every((document) => isDocumentForClient(document, clientId))
    ? uniqueIds
    : null;
}

async function replaceTaxDocuments(
  transaction: Prisma.TransactionClient,
  recordId: string,
  ids: string[],
) {
  await transaction.taxRecordDocument.deleteMany({ where: { taxRecordId: recordId } });
  if (ids.length) {
    await transaction.taxRecordDocument.createMany({
      data: ids.map((documentId) => ({ taxRecordId: recordId, documentId })),
    });
  }
}

async function replaceComplianceDocuments(
  transaction: Prisma.TransactionClient,
  taskId: string,
  ids: string[],
) {
  await transaction.complianceDocument.deleteMany({ where: { taskId } });
  if (ids.length) {
    await transaction.complianceDocument.createMany({
      data: ids.map((documentId) => ({ taskId, documentId })),
    });
  }
}

export async function createTaxRecord(
  _state: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const admin = await requirePermission("TAX", "CREATE");
  const parsed = readRecord(formData);
  if (!parsed.success) return { error: "Review the highlighted fields and try again.", fieldErrors: fieldErrors(parsed.error.issues) };
  let recordId: string;
  try {
    const record = await prisma.$transaction(async (transaction) => {
      const client = await transaction.client.findUnique({
        where: { id: parsed.data.clientId },
        select: { id: true, panNumber: true, vatRegistered: true, vatNumber: true },
      });
      if (!client) throw new Error("TAX_CLIENT_NOT_FOUND");
      const documentIds = await validateDocuments(transaction, parsed.data.documentIds, client.id);
      if (!documentIds) throw new Error("TAX_DOCUMENT_CLIENT_MISMATCH");
      const created = await transaction.clientTaxRecord.create({
        data: {
          clientId: client.id,
          panNumber: client.panNumber,
          vatRegistered: client.vatRegistered,
          vatNumber: client.vatRegistered ? client.vatNumber : null,
          taxPeriod: parsed.data.taxPeriod,
          taxType: parsed.data.taxType,
          filingStatus: parsed.data.filingStatus,
          filingDate: optionalDateValue(parsed.data.filingDate),
          dueDate: optionalDateValue(parsed.data.dueDate),
          notes: parsed.data.notes || null,
          documents: { create: documentIds.map((documentId) => ({ documentId })) },
        },
        select: { id: true, taxType: true, taxPeriod: true },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "CLIENT_TAX_RECORD_CREATED",
          targetType: "ClientTaxRecord",
          targetId: created.id,
          metadata: { taxType: created.taxType, taxPeriod: created.taxPeriod },
        },
      });
      return created;
    });
    recordId = record.id;
    revalidateTaxPaths();
  } catch (error) {
    if (error instanceof Error && error.message === "TAX_CLIENT_NOT_FOUND") return { error: "Select a valid client." };
    if (error instanceof Error && error.message === "TAX_DOCUMENT_CLIENT_MISMATCH") return { error: "Choose only documents belonging to the selected client or company documents." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A record already exists for this client, tax period, and tax type." };
    }
    console.error("[admin-tax] Tax record creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The tax record could not be saved. Please try again." };
  }
  redirect(`/admin/tax/records/${recordId}`);
}

export async function updateTaxRecord(
  recordId: string,
  _state: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const admin = await requirePermission("TAX", "EDIT");
  const id = z.string().min(1).max(191).safeParse(recordId);
  const parsed = readRecord(formData);
  if (!id.success) return { error: "This tax record could not be found." };
  if (!parsed.success) return { error: "Review the highlighted fields and try again.", fieldErrors: fieldErrors(parsed.error.issues) };
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.clientTaxRecord.findUnique({
        where: { id: id.data },
        select: { id: true, clientId: true, taxType: true, taxPeriod: true },
      });
      if (!current) return "missing" as const;
      const client = await transaction.client.findUnique({
        where: { id: parsed.data.clientId },
        select: { id: true, panNumber: true, vatRegistered: true, vatNumber: true },
      });
      if (!client) return "client" as const;
      const documentIds = await validateDocuments(transaction, parsed.data.documentIds, client.id);
      if (!documentIds) return "documents" as const;
      await transaction.clientTaxRecord.update({
        where: { id: id.data },
        data: {
          clientId: client.id,
          panNumber: client.panNumber,
          vatRegistered: client.vatRegistered,
          vatNumber: client.vatRegistered ? client.vatNumber : null,
          taxPeriod: parsed.data.taxPeriod,
          taxType: parsed.data.taxType,
          filingStatus: parsed.data.filingStatus,
          filingDate: optionalDateValue(parsed.data.filingDate),
          dueDate: optionalDateValue(parsed.data.dueDate),
          notes: parsed.data.notes || null,
        },
      });
      await replaceTaxDocuments(transaction, id.data, documentIds);
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "CLIENT_TAX_RECORD_UPDATED",
          targetType: "ClientTaxRecord",
          targetId: id.data,
          metadata: {
            previousTaxType: current.taxType,
            previousTaxPeriod: current.taxPeriod,
            taxType: parsed.data.taxType,
            taxPeriod: parsed.data.taxPeriod,
          },
        },
      });
      return "updated" as const;
    });
    if (result === "missing") return { error: "This tax record could not be found." };
    if (result === "client") return { error: "Select a valid client." };
    if (result === "documents") return { error: "Choose only documents belonging to the selected client or company documents." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A record already exists for this client, tax period, and tax type." };
    }
    console.error("[admin-tax] Tax record update failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The tax record could not be updated. Please try again." };
  }
  revalidateTaxPaths();
  revalidatePath(`/admin/tax/records/${id.data}`);
  redirect(`/admin/tax/records/${id.data}`);
}

function completionDate(status: ComplianceStatus, suppliedDate: string) {
  if (status !== ComplianceStatus.COMPLETED) return null;
  return optionalDateValue(suppliedDate) ?? new Date(new Date().toISOString().slice(0, 10));
}

export async function createComplianceTask(
  _state: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const admin = await requirePermission("TAX", "CREATE");
  const parsed = readTask(formData);
  if (!parsed.success) return { error: "Review the highlighted fields and try again.", fieldErrors: fieldErrors(parsed.error.issues) };
  let taskId: string;
  try {
    const task = await prisma.$transaction(async (transaction) => {
      const clientId = parsed.data.clientId || null;
      if (clientId) {
        const client = await transaction.client.findUnique({ where: { id: clientId }, select: { id: true } });
        if (!client) throw new Error("COMPLIANCE_CLIENT_NOT_FOUND");
      }
      const assignedToId = parsed.data.assignedToId || null;
      if (assignedToId) {
        const staff = await transaction.user.findFirst({
          where: { id: assignedToId, isActive: true },
          select: { id: true },
        });
        if (!staff) throw new Error("COMPLIANCE_ASSIGNEE_NOT_FOUND");
      }
      const documentIds = await validateDocuments(transaction, parsed.data.documentIds, clientId);
      if (!documentIds) throw new Error("COMPLIANCE_DOCUMENT_CLIENT_MISMATCH");
      const created = await transaction.complianceTask.create({
        data: {
          title: parsed.data.title,
          clientId,
          category: parsed.data.category,
          description: parsed.data.description || null,
          dueDate: optionalDateValue(parsed.data.dueDate)!,
          assignedToId,
          status: parsed.data.status,
          completedAt: completionDate(parsed.data.status, parsed.data.completedAt),
          notes: parsed.data.notes || null,
          createdById: admin.id,
          documents: { create: documentIds.map((documentId) => ({ documentId })) },
        },
        select: { id: true, title: true },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "COMPLIANCE_TASK_CREATED",
          targetType: "ComplianceTask",
          targetId: created.id,
          metadata: { title: created.title, status: parsed.data.status },
        },
      });
      return created;
    });
    taskId = task.id;
    revalidateTaxPaths();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "COMPLIANCE_CLIENT_NOT_FOUND") return { error: "Select a valid client." };
      if (error.message === "COMPLIANCE_ASSIGNEE_NOT_FOUND") return { error: "Select an active administrator for assignment." };
      if (error.message === "COMPLIANCE_DOCUMENT_CLIENT_MISMATCH") return { error: "Choose only documents belonging to the selected client or company documents." };
    }
    console.error("[admin-tax] Compliance task creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The compliance task could not be saved. Please try again." };
  }
  redirect(`/admin/tax/compliance/${taskId}`);
}

export async function updateComplianceTask(
  taskId: string,
  _state: TaxActionState,
  formData: FormData,
): Promise<TaxActionState> {
  const admin = await requirePermission("TAX", "EDIT");
  const id = z.string().min(1).max(191).safeParse(taskId);
  const parsed = readTask(formData);
  if (!id.success) return { error: "This compliance task could not be found." };
  if (!parsed.success) return { error: "Review the highlighted fields and try again.", fieldErrors: fieldErrors(parsed.error.issues) };
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.complianceTask.findUnique({
        where: { id: id.data },
        select: { title: true, status: true },
      });
      if (!current) return "missing" as const;
      const clientId = parsed.data.clientId || null;
      if (clientId) {
        const client = await transaction.client.findUnique({ where: { id: clientId }, select: { id: true } });
        if (!client) return "client" as const;
      }
      const assignedToId = parsed.data.assignedToId || null;
      if (assignedToId) {
        const staff = await transaction.user.findFirst({
          where: { id: assignedToId, isActive: true },
          select: { id: true },
        });
        if (!staff) return "assignee" as const;
      }
      const documentIds = await validateDocuments(transaction, parsed.data.documentIds, clientId);
      if (!documentIds) return "documents" as const;
      await transaction.complianceTask.update({
        where: { id: id.data },
        data: {
          title: parsed.data.title,
          clientId,
          category: parsed.data.category,
          description: parsed.data.description || null,
          dueDate: optionalDateValue(parsed.data.dueDate)!,
          assignedToId,
          status: parsed.data.status,
          completedAt: completionDate(parsed.data.status, parsed.data.completedAt),
          notes: parsed.data.notes || null,
        },
      });
      await replaceComplianceDocuments(transaction, id.data, documentIds);
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: parsed.data.status === ComplianceStatus.COMPLETED && current.status !== ComplianceStatus.COMPLETED
            ? "COMPLIANCE_TASK_COMPLETED"
            : "COMPLIANCE_TASK_UPDATED",
          targetType: "ComplianceTask",
          targetId: id.data,
          metadata: { previousTitle: current.title, title: parsed.data.title, previousStatus: current.status, status: parsed.data.status },
        },
      });
      return "updated" as const;
    });
    if (result === "missing") return { error: "This compliance task could not be found." };
    if (result === "client") return { error: "Select a valid client." };
    if (result === "assignee") return { error: "Select an active administrator for assignment." };
    if (result === "documents") return { error: "Choose only documents belonging to the selected client or company documents." };
  } catch (error) {
    console.error("[admin-tax] Compliance task update failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The compliance task could not be updated. Please try again." };
  }
  revalidateTaxPaths();
  revalidatePath(`/admin/tax/compliance/${id.data}`);
  redirect(`/admin/tax/compliance/${id.data}`);
}

export async function completeComplianceTask(
  taskId: string,
  _state: TaxActionState,
  _formData: FormData,
): Promise<TaxActionState> {
  const admin = await requirePermission("TAX", "EDIT");
  const id = z.string().min(1).max(191).safeParse(taskId);
  if (!id.success) return { error: "This compliance task could not be found." };
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const task = await transaction.complianceTask.findUnique({
        where: { id: id.data },
        select: { title: true, status: true },
      });
      if (!task) return "missing" as const;
      if (task.status === ComplianceStatus.COMPLETED) return "completed" as const;
      await transaction.complianceTask.update({
        where: { id: id.data },
        data: { status: ComplianceStatus.COMPLETED, completedAt: new Date(new Date().toISOString().slice(0, 10)) },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "COMPLIANCE_TASK_COMPLETED",
          targetType: "ComplianceTask",
          targetId: id.data,
          metadata: { title: task.title, previousStatus: task.status },
        },
      });
      return "updated" as const;
    });
    if (result === "missing") return { error: "This compliance task could not be found." };
    if (result === "completed") return { error: "This task is already completed." };
  } catch (error) {
    console.error("[admin-tax] Compliance task completion failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The compliance task could not be completed. Please try again." };
  }
  revalidateTaxPaths();
  revalidatePath(`/admin/tax/compliance/${id.data}`);
  redirect(`/admin/tax/compliance/${id.data}`);
}

function revalidateTaxPaths() {
  revalidatePath("/admin/tax");
  revalidatePath("/admin/tax/records");
  revalidatePath("/admin/tax/compliance");
}
