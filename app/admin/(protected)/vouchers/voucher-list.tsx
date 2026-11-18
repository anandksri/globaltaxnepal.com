import Link from "next/link";

export type VoucherListEntry = {
  id: string;
  number: string;
  party: string;
  date: Date;
  amount: string;
  currencyCode: string;
  method: string;
};

export function VoucherList({
  kind,
  entries,
  q,
  page,
  pages,
  total,
}: {
  kind: "receipt" | "payment";
  entries: VoucherListEntry[];
  q: string;
  page: number;
  pages: number;
  total: number;
}) {
  const root = kind === "receipt" ? "/admin/receipt-vouchers" : "/admin/payment-vouchers";
  const newLabel = kind === "receipt" ? "New receipt voucher" : "New payment voucher";
  const partyLabel = kind === "receipt" ? "Client" : "Payee";
  const pageLink = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(target));
    return `${root}?${params}`;
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {kind === "receipt" ? "Record money received from a client." : "Record money paid by the company."}
        </p>
        <Link className="button button-primary" href={`${root}/new`}>{newLabel}</Link>
      </div>
      <section className="border border-border bg-surface">
        <form action={root} className="flex flex-wrap items-end gap-3 border-b border-border p-4" method="get">
          <div className="min-w-60 flex-1">
            <label className="form-label" htmlFor={`${kind}-voucher-search`}>Search voucher or {partyLabel.toLowerCase()}</label>
            <input className="form-control" defaultValue={q} id={`${kind}-voucher-search`} name="q" />
          </div>
          <button className="button button-secondary" type="submit">Search</button>
        </form>
        {entries.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-text-secondary">No vouchers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3">Voucher number</th>
                  <th className="px-4 py-3">{partyLabel}</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{entry.number}</td>
                    <td className="px-4 py-3">{entry.party}</td>
                    <td className="whitespace-nowrap px-4 py-3">{entry.date.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                    <td className="px-4 py-3">{entry.method.replaceAll("_", " ").toLowerCase()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{entry.currencyCode} {entry.amount}</td>
                    <td className="px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={`${root}/${entry.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <p className="text-text-secondary">Page {page} of {pages} · {total} vouchers</p>
            <div className="flex gap-2">
              {page > 1 && <Link className="button button-secondary min-h-9 px-3 text-sm" href={pageLink(page - 1)}>Previous</Link>}
              {page < pages && <Link className="button button-secondary min-h-9 px-3 text-sm" href={pageLink(page + 1)}>Next</Link>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
