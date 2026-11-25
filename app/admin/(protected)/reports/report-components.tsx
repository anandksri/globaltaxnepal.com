import Link from "next/link";
import { PrintButton } from "./print-button";

export function ReportFilters({
  action,
  from = "",
  to = "",
  q = "",
  category = "",
  clientId = "",
  status = "",
  categories = [],
  clients = [],
  showSearch = false,
  showCategory = false,
  showStatus = false,
  showClient = false,
}: {
  action: string;
  from?: string;
  to?: string;
  q?: string;
  category?: string;
  clientId?: string;
  status?: string;
  categories?: Array<{ id: string; name: string }>;
  clients?: Array<{ id: string; displayName: string }>;
  showSearch?: boolean;
  showCategory?: boolean;
  showStatus?: boolean;
  showClient?: boolean;
}) {
  return (
    <form action={action} className="admin-filter-grid border border-border bg-surface p-4" method="get">
      {showSearch && <div><label className="form-label" htmlFor={`${action}-search`}>Search clients</label><input className="form-control" defaultValue={q} id={`${action}-search`} maxLength={100} name="q" type="search" /></div>}
      {showClient && <div><label className="form-label" htmlFor={`${action}-client`}>Client</label><select className="form-control" defaultValue={clientId} id={`${action}-client`} name="client"><option value="">All clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.displayName}</option>)}</select></div>}
      {showStatus && <div><label className="form-label" htmlFor={`${action}-status`}>Bill status</label><select className="form-control" defaultValue={status} id={`${action}-status`} name="status"><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="ISSUED">Issued</option><option value="PARTIALLY_PAID">Partially paid</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option></select></div>}
      {showCategory && <div><label className="form-label" htmlFor={`${action}-category`}>Category</label><select className="form-control" defaultValue={category} id={`${action}-category`} name="category"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
      <div><label className="form-label" htmlFor={`${action}-from`}>From</label><input className="form-control" defaultValue={from} id={`${action}-from`} name="from" type="date" /></div>
      <div><label className="form-label" htmlFor={`${action}-to`}>To</label><input className="form-control" defaultValue={to} id={`${action}-to`} name="to" type="date" /></div>
      <button className="button button-primary self-end" type="submit">Apply filters</button>
      <Link className="button button-secondary self-end" href={action}>Clear</Link>
    </form>
  );
}

export function ExportLinks({ report, filters }: {
  report: string;
  filters: Record<string, string>;
}) {
  const query = new URLSearchParams({ report });
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  const base = `/admin/reports/export?${query.toString()}`;
  return (
    <div className="flex flex-wrap gap-2">
      <a className="button button-secondary" href={`${base}&format=csv`}>Export CSV</a>
      <a className="button button-secondary" href={`${base}&format=pdf`}>Download PDF</a>
      <PrintButton />
    </div>
  );
}

export function ReportPagination({
  page, pages, total, path, filters,
}: {
  page: number;
  pages: number;
  total: number;
  path: string;
  filters: Record<string, string>;
}) {
  function href(nextPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    params.set("page", String(nextPage));
    return `${path}?${params.toString()}`;
  }
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <p className="text-text-secondary">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
      <div className="flex gap-2">
        {page > 1 && <Link className="button button-secondary min-h-9 px-3 text-sm" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="button button-secondary min-h-9 px-3 text-sm" href={href(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}

export function SummaryGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <div className="border border-border bg-surface px-4 py-4" key={item.label}><dt className="text-sm text-text-secondary">{item.label}</dt><dd className="mt-2 text-xl font-semibold text-primary">{item.value}</dd></div>)}
    </dl>
  );
}

export function EmptyTable({ title, message }: { title: string; message: string }) {
  return <div className="px-5 py-12 text-center"><h2 className="font-semibold text-primary">{title}</h2><p className="mt-1 text-sm text-text-secondary">{message}</p></div>;
}
