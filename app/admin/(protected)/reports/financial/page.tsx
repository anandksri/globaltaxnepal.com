import type { Metadata } from "next";
import { getFinancialReport } from "@/lib/admin/reports";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
import { EmptyTable, ExportLinks, ReportFilters, ReportPagination } from "../report-components";

export const metadata: Metadata = { title: "Income and expense reports" };
export const dynamic = "force-dynamic";

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getFinancialReport(await searchParams);
  const filters = { from: data.from, to: data.to, category: data.category };
  const categories = data.categories.map((item) => ({
    id: item.id,
    name: `${item.type === "INCOME" ? "Income" : "Expense"} · ${item.name}`,
  }));
  return (
    <div className="report-print space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-text-secondary">Linked payments and vouchers are counted once; currency totals are kept separate.</p>
        <ExportLinks filters={filters} report="financial" />
      </div>
      <ReportFilters action="/admin/reports/financial" categories={categories} category={data.category} from={data.from} showCategory to={data.to} />
      {data.currencies.length > 0 && (
        <section aria-label="Income and expenses" className="space-y-4">
          {data.currencies.map((summary) => <div className="space-y-3" key={summary.currencyCode}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{summary.currencyCode} summary</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Summary label="Total income" value={formatCurrency(moneyToCents(summary.totalIncome), summary.currencyCode)} />
              <Summary label="Total expenses" value={formatCurrency(moneyToCents(summary.totalExpenses), summary.currencyCode)} />
              <Summary label="Net income" value={formatCurrency(moneyToCents(summary.netBalance), summary.currencyCode)} />
            </div>
          </div>)}
        </section>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <CategorySummary rows={data.incomeByCategory} title="Income by category" />
        <CategorySummary rows={data.expensesByCategory} title="Expenses by category" />
      </div>
      <section aria-label="Transaction history" className="overflow-hidden border border-border bg-surface">
        <h2 className="border-b border-border px-4 py-3 font-semibold text-primary">Transaction history</h2>
        {data.transactions.length === 0 ? <EmptyTable message="No income or expense transactions match the selected filters." title="No transactions" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Party</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-border">
                {data.transactions.map((row) => <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3">{row.date.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{row.reference}</td>
                  <td className={row.type === "Income" ? "px-4 py-3 text-success" : "px-4 py-3 text-warning"}>{row.type}</td>
                  <td className="max-w-48 truncate px-4 py-3">{row.party}</td>
                  <td className="whitespace-nowrap px-4 py-3">{row.category}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(row.amount), row.currencyCode)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
        <ReportPagination filters={filters} page={data.page} pages={data.pages} path="/admin/reports/financial" total={data.total} />
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="border border-border bg-surface px-4 py-4"><p className="text-sm text-text-secondary">{label}</p><p className="mt-2 text-xl font-semibold text-primary">{value}</p></div>;
}

function CategorySummary({ title, rows }: {
  title: string;
  rows: Array<{ category: string; currencyCode: string; amount: string }>;
}) {
  return (
    <section className="border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-3 font-semibold text-primary">{title}</h2>
      {rows.length === 0 ? <p className="px-4 py-7 text-sm text-text-secondary">No records in the selected period.</p> : (
        <ul className="divide-y divide-border">
          {rows.sort((a, b) => a.category.localeCompare(b.category) || a.currencyCode.localeCompare(b.currencyCode)).map((row) => <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm" key={`${row.category}:${row.currencyCode}`}>
            <span className="text-primary">{row.category}<span className="ml-2 text-xs text-text-secondary">{row.currencyCode}</span></span>
            <span className="whitespace-nowrap font-medium">{formatCurrency(moneyToCents(row.amount), row.currencyCode)}</span>
          </li>)}
        </ul>
      )}
    </section>
  );
}
