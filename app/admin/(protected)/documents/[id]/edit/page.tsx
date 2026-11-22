import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { updateDocument } from "../../actions";
import { DocumentMetadataForm } from "../../document-forms";
import { documentCategories, getDocumentEditData } from "@/lib/admin/documents";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Edit document details" };
export const dynamic = "force-dynamic";

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("DOCUMENTS", "EDIT");
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const data = await getDocumentEditData(parsed.data);
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/documents/${data.document.id}`}>← Document details</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Edit document details. The uploaded file itself remains unchanged.</p>
        <DocumentMetadataForm
          action={updateDocument.bind(null, data.document.id)}
          categories={documentCategories}
          clients={data.clients}
          initial={{
            title: data.document.title,
            category: data.document.category,
            clientId: data.document.clientId ?? "",
            description: data.document.description ?? "",
          }}
        />
      </section>
    </div>
  );
}
