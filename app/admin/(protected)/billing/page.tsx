import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ReceiptText } from "lucide-react";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
import {
  billsPerPage,
  getBillingSummary,
  listBills,
  normalizeBillFilters,
} from "@/lib/admin/billing-data";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Normal bills" };
export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" });
}

function statusStyle(status: string) {
  if (status === "PAID") return "text-success";
  if (status === "OVERDUE" || status === "CANCELLED") return "text-error";
  if (status === "DRAFT") return "text-text-secondary";
  return "text-secondary";
}

function paginationHref(page: number, filters: ReturnType<typeof normalizeBillFilters>) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.clientId) params.set("client", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("page", String(page));
  return `/admin/billing?${params.toString()}`;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, settings] = await Promise.all([
    searchParams,
    prisma.companySettings.findUnique({
      where: { id: "company" },
      select: { currencyCode: true },
    }),
  ]);
  const filters = normalizeBillFilters(params);
  const currencyCode = settings?.currencyCode ?? "NPR";
  const [initialResult, summary] = await Promise.all([listBills(filters), getBillingSummary()]);
  let result = initialResult;
  if (filters.page > result.pages) {
    filters.page = result.pages;
    result = await listBills(filters);
  }
  const currentPage = Math.min(filters.page, result.pages);
  const pageStart = result.total ? (currentPage - 1) * billsPerPage + 1 : 0;
  const pageEnd = Math.min(currentPage * billsPerPage, result.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-text-secondary">Create and manage normal client invoices.</p>
        </div>
        <Link className="button button-primary" href="/admin/billing/new">
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Create bill
        </Link>
      </div>

      <section aria-label="Billing summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Draft bills" value={String(summary.draftCount)} />
        <Summary label="Open bills" value={String(summary.issuedCount)} />
        <Summary label="Paid bills" value={String(summary.paidCount)} />
        <Summary label="Outstanding" value={formatCurrency(summary.outstandingCents, currencyCode)} />
      </section>

      <section className="border border-border bg-surface">
        <form action="/admin/billing" className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_10rem_9rem_9rem_auto] lg:items-end" method="get">
          {filters.clientId && <input name="client" type="hidden" value={filters.clientId} />}
          <div>
            <label className="form-label" htmlFor="bill-search">Search</label>
            <input className="form-control" defaultValue={filters.query} id="bill-search" name="q" placeholder="Bill number or client" />
          </div>
          <div>
            <label className="form-label" htmlFor="bill-status">Status</label>
            <select className="form-control" defaultValue={filters.status} id="bill-status" name="status">
              <option value="">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="bill-from">From</label>
            <input className="form-control" defaultValue={filters.from} id="bill-from" name="from" type="date" />
          </div>
          <div>
            <label className="form-label" htmlFor="bill-to">To</label>
            <input className="form-control" defaultValue={filters.to} id="bill-to" name="to" type="date" />
          </div>
          <button className="button button-secondary" type="submit">Apply filters</button>
        </form>

        {result.bills.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <ReceiptText aria-hidden="true" className="mx-auto size-8 text-text-secondary" strokeWidth={1.5} />
            <h2 className="mt-3 font-semibold text-primary">No bills found</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {result.total === 0 && !filters.query && !filters.status && !filters.from && !filters.to
                ? "Bills you create will appear here."
                : "Try changing the search or filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Bill number</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Bill date</th>
                  <th className="px-4 py-3 font-semibold">Due date</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.bills.map((bill) => (
                  <tr className="hover:bg-background/70" key={bill.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{bill.billNumber}</td>
                    <td className="max-w-64 truncate px-4 py-3">{bill.clientName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(bill.billDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{bill.dueDate ? formatDate(bill.dueDate) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(bill.totalAmount.toFixed(2)), bill.currencyCode)}</td>
                    <td className={`whitespace-nowrap px-4 py-3 font-medium ${statusStyle(bill.displayStatus)}`}>{statusLabels[bill.displayStatus] ?? bill.displayStatus}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link className="font-medium text-secondary hover:text-primary" href={`/admin/billing/${bill.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p className="text-text-secondary">Showing {pageStart}–{pageEnd} of {result.total}</p>
            <div className="flex gap-2">
              {currentPage > 1 && <Link className="button button-secondary min-h-9 px-3 text-sm" href={paginationHref(currentPage - 1, filters)}>Previous</Link>}
              {currentPage < result.pages && <Link className="button button-secondary min-h-9 px-3 text-sm" href={paginationHref(currentPage + 1, filters)}>Next</Link>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-surface px-4 py-3">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="mt-1 text-lg font-semibold text-primary">{value}</p>
    </div>
  );
}
