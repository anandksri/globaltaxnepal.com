import { DocumentCategory, Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { maxDocumentSize, storeDocument, validateDocumentBytes, removeStoredDocument } from "@/lib/admin/document-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const uploadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.nativeEnum(DocumentCategory),
  clientId: z.string().trim().max(191),
  description: z.string().trim().max(1000),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "The upload request origin could not be verified." }, { status: 403 });
  }

  const admin = await requirePermission("DOCUMENTS", "CREATE");

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxDocumentSize + 256 * 1024) {
    return NextResponse.json({ error: "The upload must be no larger than 10 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload form could not be read." }, { status: 400 });
  }
  const parsed = uploadSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    clientId: formData.get("clientId") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a title and valid document category." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a document file to upload." }, { status: 400 });
  }
  if (file.size > maxDocumentSize) {
    return NextResponse.json({ error: "The upload must be no larger than 10 MB." }, { status: 413 });
  }

  const originalName = file.name.replaceAll("\\", "/").split("/").pop()?.trim() ?? "";
  if (!originalName || originalName.length > 255) {
    return NextResponse.json({ error: "The file name is invalid or too long." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const validatedFile = validateDocumentBytes(originalName, file.type, bytes);
  if (!validatedFile) {
    return NextResponse.json({
      error: "Use a matching PDF, JPG, PNG, or WebP file. The file contents must match its type.",
    }, { status: 400 });
  }

  try {
    if (parsed.data.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: parsed.data.clientId },
        select: { id: true },
      });
      if (!client) return NextResponse.json({ error: "The selected client could not be found." }, { status: 400 });
    }

    await storeDocument(validatedFile.storageKey, bytes);
    try {
      const document = await prisma.$transaction(async (transaction) => {
        const created = await transaction.document.create({
          data: {
            title: parsed.data.title,
            category: parsed.data.category,
            clientId: parsed.data.clientId || null,
            description: parsed.data.description || null,
            originalName,
            storageKey: validatedFile.storageKey,
            mimeType: validatedFile.mimeType,
            fileSize: bytes.byteLength,
            uploadedById: admin.id,
          },
          select: { id: true },
        });
        await transaction.activityLog.create({
          data: {
            actorId: admin.id,
            action: "DOCUMENT_UPLOADED",
            targetType: "Document",
            targetId: created.id,
            metadata: { title: parsed.data.title, category: parsed.data.category, fileSize: bytes.byteLength },
          },
        });
        return created;
      });
      return NextResponse.json({ id: document.id }, { status: 201 });
    } catch (error) {
      try {
        await removeStoredDocument(validatedFile.storageKey);
      } catch (cleanupError) {
        console.error("[admin-documents] Failed to remove an unregistered uploaded file.", {
          name: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
        });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "The selected client is no longer available." }, { status: 400 });
    }
    console.error("[admin-documents] Document upload failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "The document could not be saved. Check private storage configuration and try again." }, { status: 500 });
  }
}
