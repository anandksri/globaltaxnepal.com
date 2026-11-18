import type { Metadata } from "next";
import Link from "next/link";
import { DocumentUploadForm } from "../document-forms";
import { documentCategories } from "@/lib/admin/documents";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Upload document" };
export const dynamic = "force-dynamic";

export default async function NewDocumentPage() {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/documents">← Documents</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Files are stored in a private server directory and can only be accessed by authenticated administrators. Maximum file size is 10 MB.</p>
        <DocumentUploadForm categories={documentCategories} clients={clients} />
      </section>
    </div>
  );
}
