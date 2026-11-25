"use server";

import { PermissionAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isRegisterKind, registerDefinitions, validateRegisterData, type RegisterDefinition } from "@/lib/admin/office-registers";
import { prisma } from "@/lib/prisma";
import { requireRegisterAccess } from "./access";

export type RegisterActionState = { error?: string };

export async function saveRegister(
  id: string | null,
  _previous: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const kind = formData.get("kind");
  if (typeof kind !== "string" || !isRegisterKind(kind)) {
    return { error: "Invalid register type." };
  }
  const admin = await requireRegisterAccess(kind, id ? PermissionAction.EDIT : PermissionAction.CREATE);
  const validId = z.string().cuid().safeParse(id);
  if (id !== null && !validId.success) return { error: "Register not found." };
  const title = z.string().trim().min(1).max(200).safeParse(formData.get("title"));
  const clientId = z.union([z.literal(""), z.string().cuid()]).safeParse(formData.get("clientId"));
  if (!title.success || !clientId.success || (registerDefinitions[kind].clientRequired && !clientId.data)) {
    return { error: "Enter a title and select a client when required." };
  }
  const rawData = formData.get("data");
  if (typeof rawData !== "string" || rawData.length > 200_000) {
    return { error: "Register data is missing or too large." };
  }
  let input: unknown;
  try {
    input = JSON.parse(rawData);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return { error: "Register data is invalid." };
  }
  const parsed = validateRegisterData(kind, input);
  if (!parsed.success) return { error: parsed.error };

  const references = { staff: new Set<string>(), task: new Set<string>(), document: new Set<string>() };
  const definition: RegisterDefinition = registerDefinitions[kind];
  for (const section of definition.sections) {
    for (const row of parsed.data[section.key]) {
      for (const field of section.fields) {
        if ((field.type === "staff" || field.type === "task" || field.type === "document") && row[field.key]) {
          references[field.type].add(row[field.key]);
        }
      }
    }
  }
  let savedId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.officeRegister.findUnique({ where: { id }, select: { kind: true } });
        if (!existing || existing.kind !== kind) return { error: "Register not found." } as const;
      }
      const selectedClient = clientId.data || null;
      const [client, staffCount, taskCount, documentCount] = await Promise.all([
        selectedClient ? tx.client.findUnique({ where: { id: selectedClient }, select: { id: true } }) : Promise.resolve(null),
        tx.user.count({ where: { id: { in: [...references.staff] } } }),
        tx.complianceTask.count({ where: { id: { in: [...references.task] }, ...(selectedClient ? { clientId: selectedClient } : {}) } }),
        tx.document.count({ where: { id: { in: [...references.document] }, ...(selectedClient ? { clientId: selectedClient } : {}) } }),
      ]);
      if ((selectedClient && !client) || staffCount !== references.staff.size ||
          taskCount !== references.task.size || documentCount !== references.document.size) {
        return { error: "A selected client, staff member, task, or document is unavailable or does not belong to this client." } as const;
      }
      const data = {
        kind,
        title: title.data,
        clientId: selectedClient,
        data: parsed.data,
        reportDate: kind === "staff-time" ? new Date(`${parsed.data.shift[0].date}T00:00:00.000Z`) : null,
      };
      const saved = id
        ? await tx.officeRegister.update({ where: { id }, data, select: { id: true } })
        : await tx.officeRegister.create({ data: { ...data, createdById: admin.id }, select: { id: true } });
      if (id) {
        await tx.officeRegisterStaff.deleteMany({ where: { registerId: id } });
        await tx.officeRegisterTask.deleteMany({ where: { registerId: id } });
        await tx.officeRegisterDocument.deleteMany({ where: { registerId: id } });
      }
      if (references.staff.size) await tx.officeRegisterStaff.createMany({
        data: [...references.staff].map((userId) => ({ registerId: saved.id, userId })),
      });
      if (references.task.size) await tx.officeRegisterTask.createMany({
        data: [...references.task].map((taskId) => ({ registerId: saved.id, taskId })),
      });
      if (references.document.size) await tx.officeRegisterDocument.createMany({
        data: [...references.document].map((documentId) => ({ registerId: saved.id, documentId })),
      });
      await tx.activityLog.create({
        data: { actorId: admin.id, action: id ? "OFFICE_REGISTER_UPDATED" : "OFFICE_REGISTER_CREATED", targetType: "OfficeRegister", targetId: saved.id, metadata: { kind } },
      });
      return { id: saved.id } as const;
    });
    if ("error" in result) return { error: result.error };
    savedId = result.id;
  } catch (error) {
    console.error("[office-registers] Saving register failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The register could not be saved. Please try again." };
  }
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/registers/${kind}`);
  redirect(`/admin/students/registers/${kind}/${savedId}`);
}
