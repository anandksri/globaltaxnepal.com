import type { Metadata } from "next";
import { getAccountsOverview, normalizeAccountFilters } from "@/lib/admin/accounts";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
import { AccountEntriesTable } from "./account-list";

export const metadata: Metadata = { title: "Accounts overview" };
export const dynamic = "force-dynamic";

export default async function AccountsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = normalizeAccountFilters(await searchParams);
  const overview = await getAccountsOverview(filters.from, filters.to);
  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">Income and expenses include manually recorded entries, bill payments, and vouchers. Linked transactions are counted once.</p>
      <form action="/admin/accounts" className="flex flex-wrap items-end gap-3 border border-border bg-surface p-4" method="get">
        <div>
          <label className="form-label" htmlFor="overview-from">From</label>
          <input className="form-control" defaultValue={filters.from} id="overview-from" name="from" type="date" />
        </div>
        <div>
          <label className="form-label" htmlFor="overview-to">To</label>
          <input className="form-control" defaultValue={filters.to} id="overview-to" name="to" type="date" />
        </div>
        <button className="button button-primary" type="submit">Apply dates</button>
      </form>

      <section aria-label="Accounts summary" className="grid gap-3 sm:grid-cols-3">
        <Summary label="Total income" value={formatCurrency(moneyToCents(overview.totalIncome), overview.currencyCode)} />
        <Summary label="Total expenses" value={formatCurrency(moneyToCents(overview.totalExpenses), overview.currencyCode)} />
        <Summary label="Net balance" value={formatCurrency(moneyToCents(overview.netBalance), overview.currencyCode)} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <AccountEntriesTable currencyCode={overview.currencyCode} entries={overview.income} title="Recent income" />
        <AccountEntriesTable currencyCode={overview.currencyCode} entries={overview.expenses} title="Recent expenses" />
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-surface px-4 py-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-2 text-xl font-semibold text-primary">{value}</p>
    </div>
  );
}
