import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDocumentPath } from "@/lib/admin/document-storage";
import { getDocumentFile } from "@/lib/admin/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("DOCUMENTS", "VIEW");

  const { id } = await params;
  const document = await getDocumentFile(id);
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  try {
    const bytes =
      document.fileData ??
      await readFile(await getDocumentPath(document.storageKey));
    const wantsInline = request.nextUrl.searchParams.get("inline") === "1";
    const canPreview = document.mimeType === "application/pdf" || document.mimeType.startsWith("image/");
    const disposition = wantsInline && canPreview ? "inline" : "attachment";
    const fallbackName = document.originalName.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || "document";
    const encodedName = encodeURIComponent(document.originalName).replaceAll("'", "%27");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.error("[admin-documents] Document file is missing from private storage.", { documentId: document.id });
      return NextResponse.json({ error: "The stored document file is unavailable." }, { status: 404 });
    }
    console.error("[admin-documents] Document download failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "The document could not be opened." }, { status: 500 });
  }
}
