import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";

type AccountEntry = {
  id: string;
  number: string;
  date: Date;
  party: string;
  description: string;
  category: string;
  amount: string;
  currencyCode: string;
  href: string;
  kind: string;
};

type Category = { id: string; name: string };

export function AccountList({
  type,
  q,
  from,
  to,
  categoryId,
  categories,
  entries,
  total,
  page,
  pages,
}: {
  type: "income" | "expenses";
  q: string;
  from: string;
  to: string;
  categoryId: string;
  categories: Category[];
  entries: AccountEntry[];
  total: number;
  page: number;
  pages: number;
}) {
  const label = type === "income" ? "Income" : "Expense";
  const basePath = `/admin/accounts/${type}`;

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("category", categoryId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">Search and manage {type} records. Existing bills and vouchers are included once in account totals.</p>
        <Link className="button button-primary" href={`${basePath}/new`}>
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Add {label.toLowerCase()}
        </Link>
      </div>
      <form action={basePath} className="admin-filter-grid border border-border bg-surface p-4" method="get">
        <div>
          <label className="form-label" htmlFor={`${type}-search`}>Search</label>
          <input className="form-control" defaultValue={q} id={`${type}-search`} maxLength={100} name="q" placeholder="Reference, name, or description" type="search" />
        </div>
        <div>
          <label className="form-label" htmlFor={`${type}-category`}>Category</label>
          <select className="form-control" defaultValue={categoryId} id={`${type}-category`} name="category">
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor={`${type}-from`}>From</label>
          <input className="form-control" defaultValue={from} id={`${type}-from`} name="from" type="date" />
        </div>
        <div>
          <label className="form-label" htmlFor={`${type}-to`}>To</label>
          <input className="form-control" defaultValue={to} id={`${type}-to`} name="to" type="date" />
        </div>
        <button className="button button-primary self-end" type="submit">
          <Search aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Filter
        </button>
        <Link className="button button-secondary self-end" href={basePath}>Clear</Link>
      </form>

      <section aria-label={`${label} records`} className="overflow-hidden border border-border bg-surface">
        {entries.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <h2 className="font-semibold text-primary">No {type} records found</h2>
            <p className="mt-1 text-sm text-text-secondary">{total === 0 ? `Records will appear here when ${type} or source transactions are recorded.` : "Try changing the search or filters."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[66rem] border-collapse text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold" scope="col">Reference</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Date</th>
                  <th className="px-4 py-3 font-semibold" scope="col">{type === "income" ? "Client / source" : "Payee / source"}</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Category</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Description</th>
                  <th className="px-4 py-3 text-right font-semibold" scope="col">Amount</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr className="hover:bg-background/70" key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{entry.number}</td>
                    <td className="whitespace-nowrap px-4 py-3">{entry.date.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                    <td className="max-w-56 truncate px-4 py-3">{entry.party}</td>
                    <td className="whitespace-nowrap px-4 py-3">{entry.category}</td>
                    <td className="max-w-72 truncate px-4 py-3 text-text-secondary">{entry.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(entry.amount), entry.currencyCode)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link className="font-medium text-secondary hover:text-primary" href={entry.href}>View<span className="sr-only"> {entry.kind}</span></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p className="text-text-secondary">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-2">
              {page > 1 && <Link className="button button-secondary min-h-9 px-3 text-sm" href={pageHref(page - 1)}>Previous</Link>}
              {page < pages && <Link className="button button-secondary min-h-9 px-3 text-sm" href={pageHref(page + 1)}>Next</Link>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function AccountEntriesTable({
  title,
  entries,
}: {
  title: string;
  entries: Array<{ id: string; number: string; date: Date; party: string; amount: string; currencyCode: string; href: string }>;
}) {
  return (
    <section className="border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-3 font-semibold text-primary">{title}</h2>
      {entries.length === 0 ? (
        <p className="px-4 py-8 text-sm text-text-secondary">No records in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
              <tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Name</th><th className="px-4 py-3 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={entry.href}>{entry.number}</Link></td>
                  <td className="whitespace-nowrap px-4 py-3">{entry.date.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                  <td className="max-w-48 truncate px-4 py-3">{entry.party}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(entry.amount), entry.currencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
