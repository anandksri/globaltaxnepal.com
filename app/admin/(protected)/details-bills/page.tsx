import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BillStatus } from "@prisma/client";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
import { listDetailsBills } from "@/lib/admin/details-bills";

export const metadata: Metadata = { title: "Details bills" };
export const dynamic = "force-dynamic";

const statuses = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const statusNames: Record<string, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

function isStatus(value: string) {
  return statuses.includes(value) || Object.values(BillStatus).includes(value as BillStatus);
}

function dateLabel(date: Date) {
  return date.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" });
}

export default async function DetailsBillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const statusValue = typeof params.status === "string" ? params.status : "";
  const status = isStatus(statusValue) ? statusValue : "";
  const requestedPage = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const initial = await listDetailsBills({ q, status, page });
  const currentPage = Math.min(page, initial.pages);
  const result = page === currentPage ? initial : await listDetailsBills({ q, status, page: currentPage });
  const search = (nextPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    query.set("page", String(nextPage));
    return `/admin/details-bills?${query}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-text-secondary">Detailed client invoices, separate from normal bills.</p>
        <Link className="button button-primary" href="/admin/details-bills/new">
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Create details bill
        </Link>
      </div>
      <section className="border border-border bg-surface">
        <form action="/admin/details-bills" className="admin-filter-grid border-b border-border p-4" method="get">
          <div>
            <label className="form-label" htmlFor="details-search">Search bill or client</label>
            <input className="form-control" defaultValue={q} id="details-search" name="q" />
          </div>
          <div>
            <label className="form-label" htmlFor="details-status">Status</label>
            <select className="form-control" defaultValue={status} id="details-status" name="status">
              <option value="">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{statusNames[value]}</option>)}
            </select>
          </div>
          <button className="button button-secondary" type="submit">Apply filters</button>
        </form>
        {result.bills.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-text-secondary">No details bills found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3">Bill number</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.bills.map((bill) => (
                  <tr key={bill.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{bill.billNumber}</td>
                    <td className="px-4 py-3">{bill.clientName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{dateLabel(bill.billDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(bill.totalAmount.toFixed(2)), bill.currencyCode)}</td>
                    <td className="px-4 py-3">{statusNames[bill.displayStatus] ?? bill.displayStatus}</td>
                    <td className="px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={`/admin/details-bills/${bill.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <p className="text-text-secondary">Page {currentPage} of {result.pages}</p>
            <div className="flex gap-2">
              {currentPage > 1 && <Link className="button button-secondary min-h-9 px-3 text-sm" href={search(currentPage - 1)}>Previous</Link>}
              {currentPage < result.pages && <Link className="button button-secondary min-h-9 px-3 text-sm" href={search(currentPage + 1)}>Next</Link>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
