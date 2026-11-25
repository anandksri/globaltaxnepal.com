import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listTaxRecords } from "@/lib/admin/tax";
import { Pagination } from "../pagination";

export const metadata: Metadata = { title: "Client tax records" };
export const dynamic = "force-dynamic";

export default async function TaxRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await listTaxRecords(await searchParams);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">Track client tax periods, filing progress, and manually entered due dates.</p>
        <Link className="button button-primary" href="/admin/tax/records/new"><Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />Add tax record</Link>
      </div>
      <form action="/admin/tax/records" className="admin-filter-grid border border-border bg-surface p-4" method="get">
        <div>
          <label className="form-label" htmlFor="tax-record-search">Search</label>
          <input className="form-control" defaultValue={result.q} id="tax-record-search" maxLength={100} name="q" placeholder="Client, PAN, tax type, or period" type="search" />
        </div>
        <div>
          <label className="form-label" htmlFor="tax-record-status">Filing status</label>
          <select className="form-control" defaultValue={result.filingStatus} id="tax-record-status" name="status">
            <option value="">All statuses</option>
            <option value="NOT_FILED">Not filed</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="FILED">Filed</option>
          </select>
        </div>
        <button className="button button-primary self-end" type="submit">Apply filters</button>
        <Link className="button button-secondary self-end" href="/admin/tax/records">Clear</Link>
      </form>
      <section aria-label="Client tax records" className="overflow-hidden border border-border bg-surface">
        {result.records.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h2 className="font-semibold text-primary">No tax records found</h2>
            <p className="mt-1 text-sm text-text-secondary">{result.total === 0 ? "Tax records you add will appear here." : "Try changing the search or filters."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Tax type / period</th><th className="px-4 py-3">PAN / VAT</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Filing status</th><th className="px-4 py-3">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.records.map((record) => (
                  <tr className="hover:bg-background/70" key={record.id}>
                    <td className="px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={`/admin/tax/records/${record.id}`}>{record.client.displayName}</Link></td>
                    <td className="px-4 py-3">{record.taxType}<span className="mt-0.5 block text-xs text-text-secondary">{record.taxPeriod}</span></td>
                    <td className="px-4 py-3">{record.panNumber || "—"}<span className="mt-0.5 block text-xs text-text-secondary">{record.vatRegistered ? `VAT ${record.vatNumber || "registered"}` : "Not VAT registered"}</span></td>
                    <td className="whitespace-nowrap px-4 py-3">{record.dueDate ? record.dueDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" }) : "—"}</td>
                    <td className={`whitespace-nowrap px-4 py-3 font-medium ${record.filingStatus === "FILED" ? "text-success" : "text-text-secondary"}`}>{filingStatusLabel(record.filingStatus)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={`/admin/tax/records/${record.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.total > 0 && <Pagination page={result.page} pages={result.pages} total={result.total} params={{ q: result.q, status: result.filingStatus }} path="/admin/tax/records" />}
      </section>
    </div>
  );
}

function filingStatusLabel(status: string) {
  return status === "FILED" ? "Filed" : status === "IN_PROGRESS" ? "In progress" : "Not filed";
}
