import type { Metadata } from "next";
import { getClientReport } from "@/lib/admin/reports";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
import { EmptyTable, ExportLinks, ReportFilters, ReportPagination, SummaryGrid } from "../report-components";

export const metadata: Metadata = { title: "Client reports" };
export const dynamic = "force-dynamic";

export default async function ClientReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getClientReport(await searchParams);
  const filters = { from: data.from, to: data.to, q: data.q };
  return (
    <div className="report-print space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-text-secondary">Bill payments and receipt vouchers are shown separately by currency. Billing and outstanding exclude draft and cancelled bills in the selected issue-date range.</p>
        <ExportLinks filters={filters} report="clients" />
      </div>
      <SummaryGrid items={[
        { label: "Total clients", value: String(data.total) },
        { label: "Active clients", value: String(data.active) },
        { label: "Inactive clients", value: String(data.inactive) },
      ]} />
      <ReportFilters action="/admin/reports/clients" from={data.from} q={data.q} showSearch to={data.to} />
      <section aria-label="Client billing summaries" className="overflow-hidden border border-border bg-surface">
        {data.clients.length === 0 ? <EmptyTable message="No clients match the selected search." title="No client records" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[68rem] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Currency</th><th className="px-4 py-3 text-right">Billed</th><th className="px-4 py-3 text-right">Bill payments</th><th className="px-4 py-3 text-right">Receipt vouchers</th><th className="px-4 py-3 text-right">Outstanding</th></tr></thead>
              <tbody className="divide-y divide-border">
                {data.clients.map((client) => {
                  const currencyCodes = new Set([
                    ...client.billed.map((row) => row.currencyCode),
                    ...client.paid.map((row) => row.currencyCode),
                    ...client.receipts.map((row) => row.currencyCode),
                    ...client.outstanding.map((row) => row.currencyCode),
                  ]);
                  if (currencyCodes.size === 0) currencyCodes.add("—");
                  return [...currencyCodes].map((currencyCode, index) => <tr key={`${client.id}:${currencyCode}`}>
                    {index === 0 && <td className="px-4 py-3 font-medium text-primary" rowSpan={currencyCodes.size}>{client.displayName}</td>}
                    {index === 0 && <td className="px-4 py-3" rowSpan={currencyCodes.size}><span className={client.isActive ? "text-success" : "text-text-secondary"}>{client.isActive ? "Active" : "Inactive"}</span></td>}
                    <td className="whitespace-nowrap px-4 py-3">{currencyCode}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatClientAmount(client.billed, currencyCode)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatClientAmount(client.paid, currencyCode)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatClientAmount(client.receipts, currencyCode)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatClientAmount(client.outstanding, currencyCode)}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
        )}
        <ReportPagination filters={filters} page={data.page} pages={data.pages} path="/admin/reports/clients" total={data.total} />
      </section>
    </div>
  );
}

function formatClientAmount(rows: Array<{ currencyCode: string; amount: string }>, currencyCode: string) {
  if (currencyCode === "—") return "—";
  return formatCurrency(moneyToCents(rows.find((row) => row.currencyCode === currencyCode)?.amount ?? "0"), currencyCode);
}
