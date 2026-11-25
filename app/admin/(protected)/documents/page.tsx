import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { documentCategoryLabel, listDocuments } from "@/lib/admin/documents";

export const metadata: Metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await listDocuments(await searchParams);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">Securely organize and retrieve private client and company documents.</p>
        <Link className="button button-primary" href="/admin/documents/new">
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Upload document
        </Link>
      </div>

      <section aria-label="Document summary" className="grid gap-3 sm:grid-cols-[minmax(12rem,0.6fr)_minmax(0,1.4fr)]">
        <div className="border border-border bg-surface px-4 py-4">
          <p className="text-sm text-text-secondary">Total documents</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{result.totalDocuments}</p>
        </div>
        <div className="border border-border bg-surface px-4 py-4">
          <h2 className="text-sm font-semibold text-primary">Document categories</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {result.categories.map((category) => (
              <Link
                className={`flex justify-between gap-2 text-xs hover:text-secondary ${result.category === category.value ? "font-semibold text-secondary" : "text-text-secondary"}`}
                href={category.count ? `/admin/documents?category=${category.value}` : "/admin/documents"}
                key={category.value}
              >
                <span>{category.label}</span>
                <span className="tabular-nums">{category.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <form action="/admin/documents" className="admin-filter-grid border border-border bg-surface p-4" method="get">
        <div>
          <label className="form-label" htmlFor="document-search">Search documents</label>
          <input className="form-control" defaultValue={result.q} id="document-search" maxLength={100} name="q" placeholder="Title, file name, or client" type="search" />
        </div>
        <div>
          <label className="form-label" htmlFor="document-filter-category">Category</label>
          <select className="form-control" defaultValue={result.category} id="document-filter-category" name="category">
            <option value="">All categories</option>
            {result.categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="document-filter-client">Client</label>
          <select className="form-control" defaultValue={result.clientId} id="document-filter-client" name="client">
            <option value="">All clients</option>
            {result.clients.map((client) => <option key={client.id} value={client.id}>{client.displayName}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="document-filter-from">Uploaded from</label>
          <input className="form-control" defaultValue={result.from} id="document-filter-from" name="from" type="date" />
        </div>
        <div>
          <label className="form-label" htmlFor="document-filter-to">Uploaded to</label>
          <input className="form-control" defaultValue={result.to} id="document-filter-to" name="to" type="date" />
        </div>
        <button className="button button-primary self-end" type="submit">Apply filters</button>
        <Link className="button button-secondary self-end" href="/admin/documents">Clear</Link>
      </form>

      <section aria-label="Document records" className="overflow-hidden border border-border bg-surface">
        {result.documents.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <FileText aria-hidden="true" className="mx-auto size-8 text-text-secondary" strokeWidth={1.5} />
            <h2 className="mt-3 font-semibold text-primary">No documents found</h2>
            <p className="mt-1 text-sm text-text-secondary">{result.total === 0 ? "Uploaded documents will appear here." : "Try changing the search or filters."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold" scope="col">Title</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Category</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Client</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Uploaded</th>
                  <th className="px-4 py-3 font-semibold" scope="col">File</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.documents.map((document) => (
                  <tr className="hover:bg-background/70" key={document.id}>
                    <td className="max-w-64 px-4 py-3">
                      <Link className="font-medium text-primary hover:text-secondary" href={`/admin/documents/${document.id}`}>{document.title}</Link>
                      <span className="mt-0.5 block truncate text-xs text-text-secondary">{document.originalName}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{documentCategoryLabel(document.category)}</td>
                    <td className="max-w-48 truncate px-4 py-3">{document.client?.displayName ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{document.createdAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                    <td className="whitespace-nowrap px-4 py-3">{document.mimeType.split("/").pop()?.toUpperCase()} · {formatBytes(document.fileSize)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={`/admin/documents/${document.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p className="text-text-secondary">Showing {(result.page - 1) * 20 + 1}–{Math.min(result.page * 20, result.total)} of {result.total}</p>
            <div className="flex gap-2">
              {result.page > 1 && <Link className="button button-secondary min-h-9 px-3 text-sm" href={pageHref(result.page - 1, result)}>Previous</Link>}
              {result.page < result.pages && <Link className="button button-secondary min-h-9 px-3 text-sm" href={pageHref(result.page + 1, result)}>Next</Link>}
            </div>
          </div>
        )}
      </section>

      <section aria-label="Recent uploads" className="border border-border bg-surface p-4">
        <h2 className="font-semibold text-primary">Recent uploads</h2>
        {result.recentUploads.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">No documents have been uploaded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {result.recentUploads.map((document) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" key={document.id}>
                <Link className="font-medium text-secondary hover:text-primary" href={`/admin/documents/${document.id}`}>{document.title}</Link>
                <span className="text-text-secondary">{document.createdAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })} · {document.client?.displayName ?? "Company"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pageHref(
  page: number,
  filters: { q: string; category: string; clientId: string; from: string; to: string },
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.clientId) params.set("client", filters.clientId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("page", String(page));
  return `/admin/documents?${params.toString()}`;
}
