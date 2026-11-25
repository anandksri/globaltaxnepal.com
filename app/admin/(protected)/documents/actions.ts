"use server";

import { DocumentCategory, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { removeStoredDocument } from "@/lib/admin/document-storage";
import { prisma } from "@/lib/prisma";

export type DocumentActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const metadataSchema = z.object({
  title: z.string().trim().min(1, "Enter a document title.").max(200),
  category: z.nativeEnum(DocumentCategory),
  clientId: z.string().trim().max(191),
  description: z.string().trim().max(1000),
});

function errorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function getMetadata(formData: FormData) {
  return metadataSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    clientId: formData.get("clientId") ?? "",
    description: formData.get("description") ?? "",
  });
}

export async function updateDocument(
  documentId: string,
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const admin = await requirePermission("DOCUMENTS", "EDIT");
  const id = z.string().min(1).max(191).safeParse(documentId);
  const parsed = getMetadata(formData);
  if (!id.success) return { error: "This document could not be found." };
  if (!parsed.success) {
    return { error: "Review the highlighted fields and try again.", fieldErrors: errorsFrom(parsed.error.issues) };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.document.findUnique({
        where: { id: id.data },
        select: { title: true, category: true, clientId: true },
      });
      if (!current) return "missing" as const;
      const clientId = parsed.data.clientId || null;
      if (clientId) {
        const client = await transaction.client.findUnique({ where: { id: clientId }, select: { id: true } });
        if (!client) return "client" as const;
      }
      await transaction.document.update({
        where: { id: id.data },
        data: {
          title: parsed.data.title,
          category: parsed.data.category,
          clientId,
          description: parsed.data.description || null,
        },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "DOCUMENT_METADATA_UPDATED",
          targetType: "Document",
          targetId: id.data,
          metadata: {
            previousTitle: current.title,
            previousCategory: current.category,
            title: parsed.data.title,
            category: parsed.data.category,
          },
        },
      });
      return "updated" as const;
    });
    if (result === "missing") return { error: "This document could not be found." };
    if (result === "client") return { error: "The selected client could not be found." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { error: "The selected client is no longer available." };
    }
    console.error("[admin-documents] Document metadata update failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "Document details could not be updated. Please try again." };
  }
  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${id.data}`);
  redirect(`/admin/documents/${id.data}`);
}

export async function deleteDocument(
  documentId: string,
  _state: DocumentActionState,
  _formData: FormData,
): Promise<DocumentActionState> {
  const admin = await requirePermission("DOCUMENTS", "DELETE");
  const id = z.string().min(1).max(191).safeParse(documentId);
  if (!id.success) return { error: "This document could not be found." };
  let storageKey: string | null = null;
  try {
    await prisma.$transaction(async (transaction) => {
      const document = await transaction.document.findUnique({
        where: { id: id.data },
        select: { storageKey: true, fileData: true, title: true, originalName: true },
      });
      if (!document) throw new Error("DOCUMENT_NOT_FOUND");
      storageKey = document.fileData === null ? document.storageKey : null;
      await transaction.document.delete({ where: { id: id.data } });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "DOCUMENT_DELETED",
          targetType: "Document",
          targetId: id.data,
          metadata: { title: document.title, originalName: document.originalName },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DOCUMENT_NOT_FOUND") {
      return { error: "This document could not be found." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { error: "This document is linked to an office register. Remove it from the register before deleting it." };
    }
    console.error("[admin-documents] Document record deletion failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The document could not be deleted. Please try again." };
  }

  if (storageKey) {
    try {
      await removeStoredDocument(storageKey);
    } catch (error) {
      console.error("[admin-documents] Document record was removed but its private file cleanup failed.", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return { error: "The document record was removed, but its private file could not be cleaned up. Contact your system administrator." };
    }
  }
  revalidatePath("/admin/documents");
  redirect("/admin/documents");
}
