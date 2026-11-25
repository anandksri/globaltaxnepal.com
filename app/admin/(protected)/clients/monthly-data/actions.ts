"use server";

import { PermissionAction, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { nepaliMonths, parseMonthlyDates } from "@/lib/admin/client-monthly-data";
import { prisma } from "@/lib/prisma";

export type MonthlyActionState = { error?: string; success?: string };

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
