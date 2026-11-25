import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DeleteDocumentButton } from "../document-controls";
import { deleteDocument } from "../actions";
import { documentCategoryLabel, getDocument } from "@/lib/admin/documents";

export const metadata: Metadata = { title: "Document details" };
export const dynamic = "force-dynamic";

export default async function DocumentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const document = await getDocument(parsed.data);
  if (!document) notFound();
  const fileUrl = `/admin/documents/${document.id}/file`;
  const previewable = document.mimeType === "application/pdf" || document.mimeType.startsWith("image/");
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/documents">← Documents</Link>
        <div className="flex flex-wrap gap-2">
          <Link className="button button-secondary" href={`/admin/documents/${document.id}/edit`}>Edit details</Link>
          <a className="button button-primary" href={fileUrl}>Download file</a>
        </div>
      </div>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{documentCategoryLabel(document.category)}</p>
            <h2 className="mt-1 break-words text-xl font-semibold text-primary">{document.title}</h2>
            <p className="mt-1 break-all text-sm text-text-secondary">{document.originalName}</p>
          </div>
          <p className="text-sm text-text-secondary">{formatBytes(document.fileSize)} · {document.mimeType}</p>
        </div>
        <dl className="grid gap-x-6 gap-y-4 py-5 sm:grid-cols-2">
          <Detail label="Linked client" value={document.client?.displayName ?? "Company / unlinked"} />
          <Detail
            label="Attachment date"
            value={
              document.documentDate?.toLocaleDateString("en-NP", {
                dateStyle: "medium",
                timeZone: "UTC",
              }) ?? "—"
            }
          />
          <Detail label="Uploaded" value={document.createdAt.toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} />
          <Detail label="Uploaded by" value={document.uploadedBy.name ?? document.uploadedBy.email} />
          <Detail label="Last updated" value={document.updatedAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })} />
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-primary">{document.description || "—"}</dd>
          </div>
        </dl>
        {previewable && (
          <div className="border-t border-border pt-5">
            <h3 className="mb-3 text-sm font-semibold text-primary">Preview</h3>
            {document.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={document.title} className="max-h-[70vh] max-w-full object-contain" src={`${fileUrl}?inline=1`} />
            ) : (
              <iframe className="h-[70vh] w-full border border-border" src={`${fileUrl}?inline=1`} title={`Preview: ${document.title}`} />
            )}
          </div>
        )}
      </section>
      <DeleteDocumentButton action={deleteDocument.bind(null, document.id)} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</dt><dd className="mt-1 break-words text-sm text-primary">{value}</dd></div>;
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
