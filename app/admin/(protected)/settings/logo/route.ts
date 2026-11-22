import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/admin/auth";
import { getDocumentPath, removeStoredDocument, storeDocument, validateDocumentBytes } from "@/lib/admin/document-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxLogoSize = 2 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function GET() {
  await requireAdmin();
  const settings = await prisma.companySettings.findUnique({
    where: { id: "company" },
    select: { logoStorageKey: true, logoMimeType: true },
  });
  if (!settings?.logoStorageKey || !settings.logoMimeType) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(await getDocumentPath(settings.logoStorageKey));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": settings.logoMimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.error("[admin-settings] Private company logo is missing from storage.");
      return new Response("Not found", { status: 404 });
    }
    console.error("[admin-settings] Private company logo could not be read.", { name: error instanceof Error ? error.name : "UnknownError" });
    return new Response("Logo could not be loaded.", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission("SETTINGS", "EDIT");
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "The upload request origin could not be verified." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxLogoSize + 64 * 1024) {
    return NextResponse.json({ error: "The logo must be no larger than 2 MB." }, { status: 413 });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload form could not be read." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (file.size > maxLogoSize) return NextResponse.json({ error: "The logo must be no larger than 2 MB." }, { status: 413 });
  if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: "Use a PNG, JPG, or WebP image." }, { status: 400 });
  const originalName = file.name.replaceAll("\\", "/").split("/").pop()?.trim() ?? "";
  if (!originalName || originalName.length > 255) return NextResponse.json({ error: "The image file name is invalid." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const validFile = validateDocumentBytes(originalName, file.type, bytes);
  if (!validFile) return NextResponse.json({ error: "The image contents do not match its file type." }, { status: 400 });

  try {
    await storeDocument(validFile.storageKey, bytes);
    let oldStorageKey: string | null = null;
    try {
      await prisma.$transaction(async (transaction) => {
        const previous = await transaction.companySettings.findUnique({
          where: { id: "company" },
          select: { logoStorageKey: true },
        });
        oldStorageKey = previous?.logoStorageKey ?? null;
        await transaction.companySettings.upsert({
          where: { id: "company" },
          create: {
            id: "company",
            name: "Global Tax Nepal",
            logoStorageKey: validFile.storageKey,
            logoMimeType: validFile.mimeType,
            logoOriginalName: originalName,
          },
          update: {
            logoStorageKey: validFile.storageKey,
            logoMimeType: validFile.mimeType,
            logoOriginalName: originalName,
          },
        });
        await transaction.activityLog.create({
          data: {
            actorId: admin.id,
            action: "COMPANY_LOGO_UPDATED",
            targetType: "CompanySettings",
            targetId: "company",
            metadata: { mimeType: validFile.mimeType, fileSize: bytes.byteLength },
          },
        });
      });
    } catch (error) {
      try {
        await removeStoredDocument(validFile.storageKey);
      } catch (cleanupError) {
        console.error("[admin-settings] Unregistered company logo could not be removed from private storage.", { name: cleanupError instanceof Error ? cleanupError.name : "UnknownError" });
      }
      throw error;
    }
    if (oldStorageKey && oldStorageKey !== validFile.storageKey) {
      try {
        await removeStoredDocument(oldStorageKey);
      } catch (error) {
        console.error("[admin-settings] Replaced company logo could not be removed from private storage.", { name: error instanceof Error ? error.name : "UnknownError" });
      }
    }
    return NextResponse.json({ success: "Company logo uploaded." });
  } catch (error) {
    console.error("[admin-settings] Company logo upload failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "The company logo could not be saved. Check private storage configuration and try again." }, { status: 500 });
  }
}
