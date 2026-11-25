"use server";

import { PermissionAction, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { nepaliMonths, parseMonthlyDates } from "@/lib/admin/client-monthly-data";
import { prisma } from "@/lib/prisma";

export type MonthlyActionState = { error?: string; success?: string };

const manualIdentitySchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40),
  panNumber: z.string().trim().max(20),
});

function manualIdentity(formData: FormData) {
  return manualIdentitySchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    panNumber: formData.get("panNumber"),
  });
}

export async function createManualClient(
  _previous: MonthlyActionState,
  formData: FormData,
): Promise<MonthlyActionState> {
  const admin = await requirePermission("CLIENTS", PermissionAction.CREATE);
  await requirePermission("DOCUMENTS", PermissionAction.VIEW);
  const identity = manualIdentity(formData);
  if (!identity.success) return { error: "Enter a client name and check the mobile and PAN fields." };
  let id: string;
  try {
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.manualMonthlyClient.create({
        data: {
          displayName: identity.data.displayName,
          phone: identity.data.phone || null,
          panNumber: identity.data.panNumber || null,
          dates: Object.fromEntries(nepaliMonths.map((month) => [month.key, ""])),
        },
        select: { id: true },
      });
      await tx.activityLog.create({
        data: { actorId: admin.id, action: "MANUAL_MONTHLY_CLIENT_CREATED", targetType: "ManualMonthlyClient", targetId: created.id },
      });
      return created;
    });
    id = record.id;
  } catch (error) {
    console.error("[client-monthly-data] Creating manual client failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The manual client could not be added. Please try again." };
  }
  revalidatePath("/admin/clients/monthly-data");
  redirect(`/admin/clients/monthly-data/manual/${id}`);
}

export async function saveManualClient(
  id: string,
  _previous: MonthlyActionState,
  formData: FormData,
): Promise<MonthlyActionState> {
  const admin = await requirePermission("CLIENTS", PermissionAction.EDIT);
  await requirePermission("DOCUMENTS", PermissionAction.VIEW);
  if (!z.string().cuid().safeParse(id).success) return { error: "Manual client not found." };
  const identity = manualIdentity(formData);
  if (!identity.success) return { error: "Enter a client name and check the mobile and PAN fields." };
  const parsed = parseMonthlyDates(Object.fromEntries(nepaliMonths.map((month) => [month.key, formData.get(month.key)])));
  if (!parsed.success) return { error: parsed.error };
  const remarks = z.string().trim().max(5000).safeParse(formData.get("remarks"));
  const documents = z.array(z.string().cuid()).max(100).safeParse(formData.getAll("documentId"));
  if (!remarks.success || !documents.success || new Set(documents.data).size !== documents.data.length) {
    return { error: "Check the remarks and selected documents." };
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [manual, count] = await Promise.all([
        tx.manualMonthlyClient.findUnique({ where: { id }, select: { id: true } }),
        tx.document.count({ where: { clientId: null, id: { in: documents.data } } }),
      ]);
      if (!manual || count !== documents.data.length) return false;
      await tx.manualMonthlyClient.update({
        where: { id },
        data: {
          displayName: identity.data.displayName, phone: identity.data.phone || null,
          panNumber: identity.data.panNumber || null, dates: parsed.dates, remarks: remarks.data || null,
        },
      });
      await tx.manualMonthlyDocument.deleteMany({ where: { manualClientId: id } });
      if (documents.data.length) await tx.manualMonthlyDocument.createMany({
        data: documents.data.map((documentId) => ({ manualClientId: id, documentId })),
      });
      await tx.activityLog.create({
        data: { actorId: admin.id, action: "MANUAL_MONTHLY_CLIENT_UPDATED", targetType: "ManualMonthlyClient", targetId: id },
      });
      return true;
    });
    if (!result) return { error: "The manual client or a selected unassigned document is unavailable." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { error: "A selected document is no longer available." };
    }
    console.error("[client-monthly-data] Saving manual client failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The manual client could not be saved. Please try again." };
  }
  revalidatePath("/admin/clients/monthly-data");
  revalidatePath(`/admin/clients/monthly-data/manual/${id}`);
  return { success: "Client monthly data saved." };
}

export async function saveMonthlyData(
  clientId: string,
  _previous: MonthlyActionState,
  formData: FormData,
): Promise<MonthlyActionState> {
  const admin = await requirePermission("CLIENTS", PermissionAction.EDIT);
  await requirePermission("DOCUMENTS", PermissionAction.VIEW);
  if (!z.string().cuid().safeParse(clientId).success) return { error: "Client not found." };
  const parsed = parseMonthlyDates(Object.fromEntries(nepaliMonths.map((month) => [month.key, formData.get(month.key)])));
  if (!parsed.success) return { error: parsed.error };
  const remarks = z.string().trim().max(5000).safeParse(formData.get("remarks"));
  const documents = z.array(z.string().cuid()).max(100).safeParse(formData.getAll("documentId"));
  if (!remarks.success || !documents.success || new Set(documents.data).size !== documents.data.length) {
    return { error: "Check the remarks and selected documents." };
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [client, count] = await Promise.all([
        tx.client.findUnique({ where: { id: clientId }, select: { id: true } }),
        tx.document.count({ where: { clientId, id: { in: documents.data } } }),
      ]);
      if (!client || count !== documents.data.length) return false;
      await tx.clientMonthlyData.upsert({
        where: { clientId },
        create: { clientId, dates: parsed.dates, remarks: remarks.data || null },
        update: { dates: parsed.dates, remarks: remarks.data || null },
      });
      await tx.clientMonthlyDocument.deleteMany({ where: { clientId } });
      if (documents.data.length) await tx.clientMonthlyDocument.createMany({
        data: documents.data.map((documentId) => ({ clientId, documentId })),
      });
      await tx.activityLog.create({
        data: { actorId: admin.id, action: "CLIENT_MONTHLY_DATA_UPDATED", targetType: "Client", targetId: clientId },
      });
      return true;
    });
    if (!result) return { error: "The client or a selected document is unavailable or belongs to another client." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { error: "The client or a selected document is no longer available." };
    }
    console.error("[client-monthly-data] Saving failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "Client monthly data could not be saved. Please try again." };
  }
  revalidatePath("/admin/clients/monthly-data");
  revalidatePath(`/admin/clients/monthly-data/${clientId}`);
  return { success: "Client monthly data saved." };
}
