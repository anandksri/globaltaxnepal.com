import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("DASHBOARD", "VIEW");
  const { id } = await params;
  const enquiry = await prisma.websiteEnquiry.findUnique({
    where: { id },
    select: { attachmentName: true, attachmentData: true },
  });
  if (!enquiry?.attachmentName || !enquiry.attachmentData) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }
  const fallbackName = enquiry.attachmentName.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || "attachment";
  const encodedName = encodeURIComponent(enquiry.attachmentName).replaceAll("'", "%27");
  return new Response(new Uint8Array(enquiry.attachmentData), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
