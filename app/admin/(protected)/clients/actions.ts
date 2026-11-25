"use server";

import { DocumentCategory, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { clientIdSchema, getClientFormData } from "@/lib/admin/clients";
import {
  maxDocumentSize,
  validateDocumentBytes,
} from "@/lib/admin/document-storage";
import { prisma } from "@/lib/prisma";

export type ClientActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function getFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

const optionalDocumentText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const clientDocumentSchema = z.object({
  title: optionalDocumentText(200),
  note: optionalDocumentText(1000),
});

function getClientData(data: NonNullable<ReturnType<typeof getClientFormData>["data"]>) {
  return {
    type: data.type,
    displayName: data.displayName,
    contactPerson: data.contactPerson ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    additionalContactName: data.additionalContactName ?? null,
    additionalContactMobile: data.additionalContactMobile ?? null,
    additionalContactAddress: data.additionalContactAddress ?? null,
    additionalContactFirmName: data.additionalContactFirmName ?? null,
    province: data.province ?? null,
    district: data.district ?? null,
    municipality: data.municipality ?? null,
    wardNumber: data.wardNumber ?? null,
    streetAddress: data.streetAddress ?? null,
    panNumber: data.panNumber ?? null,
    vatRegistered: data.vatRegistered,
    vatNumber: data.vatNumber ?? null,
    registrationDate: data.registrationDate
      ? new Date(`${data.registrationDate}T00:00:00.000Z`)
      : null,
    notes: data.notes ?? null,
    isActive: data.isActive,
  };
}

export async function createClient(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const admin = await requirePermission("CLIENTS", "CREATE");
  const parsed = getClientFormData(formData);

  if (!parsed.success) {
    return {
      error: "Review the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsed.error.issues),
    };
  }

  const parsedDocument = clientDocumentSchema.safeParse({
    title: formData.get("documentTitle"),
    note: formData.get("documentNote"),
  });
  if (!parsedDocument.success) {
    return {
      error: "Review the highlighted document fields and try again.",
      fieldErrors: getFieldErrors(
        parsedDocument.error.issues.map((issue) => ({
          ...issue,
          path: [issue.path[0] === "title" ? "documentTitle" : "documentNote"],
        })),
      ),
    };
  }

  const fileValues = formData.getAll("documentFiles");
  if (fileValues.some((value) => !(value instanceof File))) {
    return {
      error: "Choose valid document files.",
      fieldErrors: { documentFile: "Choose valid document files." },
    };
  }
  const files = fileValues.filter(
    (value): value is File => value instanceof File && value.name !== "",
  );
  if (files.length > 10) {
    return {
      error: "You can upload up to 10 documents at a time.",
      fieldErrors: { documentFile: "Choose no more than 10 documents." },
    };
  }
  if (files.reduce((total, file) => total + file.size, 0) > maxDocumentSize) {
    return {
      error: "The total size of all documents must be no larger than 10 MB.",
      fieldErrors: { documentFile: "The total upload size must be no larger than 10 MB." },
    };
  }
  if (files.length > 0) {
    await requirePermission("DOCUMENTS", "CREATE");
  }

  const uploadedDocuments: Array<{
    title: string;
    note: string | null;
    originalName: string;
    storageKey: string;
    mimeType: string;
    bytes: Buffer;
  }> = [];
  for (const file of files) {
    if (file.size === 0) {
      return {
        error: "Choose a non-empty document file.",
        fieldErrors: { documentFile: "The selected file is empty." },
      };
    }
    if (file.size > maxDocumentSize) {
      return {
        error: "The document must be no larger than 10 MB.",
        fieldErrors: { documentFile: "The document must be no larger than 10 MB." },
      };
    }

    const originalName = file.name.replaceAll("\\", "/").split("/").pop()?.trim() ?? "";
    if (!originalName || originalName.length > 255) {
      return {
        error: "The document file name is invalid or too long.",
        fieldErrors: { documentFile: "The file name is invalid or too long." },
      };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const validatedFile = validateDocumentBytes(originalName, file.type, bytes);
    if (!validatedFile) {
      return {
        error: "Use a matching PDF, JPG, PNG, or WebP file.",
        fieldErrors: {
          documentFile: "The file contents must match its PDF, JPG, PNG, or WebP type.",
        },
      };
    }

    const defaultTitle =
      originalName.replace(/\.[^.]+$/, "").trim().slice(0, 200) ||
      originalName.slice(0, 200);
    uploadedDocuments.push({
      title:
        files.length === 1
          ? parsedDocument.data.title ?? defaultTitle
          : defaultTitle,
      note: parsedDocument.data.note ?? null,
      originalName,
      storageKey: validatedFile.storageKey,
      mimeType: validatedFile.mimeType,
      bytes,
    });
  }

  let clientId: string;

  try {
    const client = await prisma.$transaction(async (transaction) => {
      const created = await transaction.client.create({
        data: getClientData(parsed.data),
        select: { id: true },
      });

      for (const uploadedDocument of uploadedDocuments) {
        const document = await transaction.document.create({
          data: {
            title: uploadedDocument.title,
            category: DocumentCategory.OTHER,
            description: uploadedDocument.note,
            clientId: created.id,
            originalName: uploadedDocument.originalName,
            storageKey: uploadedDocument.storageKey,
            mimeType: uploadedDocument.mimeType,
            fileSize: uploadedDocument.bytes.byteLength,
            fileData: Uint8Array.from(uploadedDocument.bytes),
            uploadedById: admin.id,
          },
          select: { id: true },
        });

        await transaction.activityLog.create({
          data: {
            actorId: admin.id,
            action: "DOCUMENT_UPLOADED",
            targetType: "Document",
            targetId: document.id,
            metadata: {
              title: uploadedDocument.title,
              category: DocumentCategory.OTHER,
              fileSize: uploadedDocument.bytes.byteLength,
            },
          },
        });
      }

      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "CLIENT_CREATED",
          targetType: "Client",
          targetId: created.id,
        },
      });

      return created;
    });
    clientId = client.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "A client with this PAN number already exists.",
        fieldErrors: { panNumber: "This PAN number is already assigned to a client." },
      };
    }

    console.error("[admin-clients] Client creation failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The client could not be saved. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${clientId}`);
}

export async function updateClient(
  clientId: string,
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const admin = await requirePermission("CLIENTS", "EDIT");
  const validId = clientIdSchema.safeParse(clientId);

  if (!validId.success) {
    return { error: "This client record could not be found." };
  }

  const parsed = getClientFormData(formData);
  if (!parsed.success) {
    return {
      error: "Review the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsed.error.issues),
    };
  }

  try {
    const updateResult = await prisma.$transaction(async (transaction) => {
      const current = await transaction.client.findUnique({
        where: { id: validId.data },
        select: { isActive: true },
      });

      if (!current) {
        return "missing" as const;
      }

      if (current.isActive && !parsed.data.isActive) {
        return "confirm-deactivation" as const;
      }

      await transaction.client.update({
        where: { id: validId.data },
        data: getClientData(parsed.data),
      });

      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "CLIENT_UPDATED",
          targetType: "Client",
          targetId: validId.data,
        },
      });

      return "updated" as const;
    });

    if (updateResult === "missing") {
      return { error: "This client record could not be found." };
    }

    if (updateResult === "confirm-deactivation") {
      return {
        error: "Use the Deactivate action from the client details page to confirm this change.",
      };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          error: "A client with this PAN number already exists.",
          fieldErrors: {
            panNumber: "This PAN number is already assigned to a client.",
          },
        };
      }

      if (error.code === "P2025") {
        return { error: "This client record could not be found." };
      }
    }

    console.error("[admin-clients] Client update failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The client could not be updated. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${validId.data}`);
  redirect(`/admin/clients/${validId.data}`);
}

export async function deactivateClient(
  clientId: string,
  _previousState: { error?: string },
  _formData: FormData,
): Promise<{ error?: string }> {
  const admin = await requirePermission("CLIENTS", "DELETE");
  const validId = clientIdSchema.safeParse(clientId);

  if (!validId.success) {
    return { error: "This client record could not be found." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const result = await transaction.client.updateMany({
        where: { id: validId.data, isActive: true },
        data: { isActive: false },
      });

      if (result.count === 0) {
        const client = await transaction.client.findUnique({
          where: { id: validId.data },
          select: { id: true },
        });
        if (!client) {
          throw new Error("CLIENT_NOT_FOUND");
        }
        return;
      }

      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "CLIENT_DEACTIVATED",
          targetType: "Client",
          targetId: validId.data,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
      return { error: "This client record could not be found." };
    }

    console.error("[admin-clients] Client deactivation failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The client could not be deactivated. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${validId.data}`);
  redirect("/admin/clients");
}
