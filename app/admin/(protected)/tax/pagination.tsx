import Link from "next/link";

export function Pagination({
  page, pages, total, params, path,
}: {
  page: number; pages: number; total: number; params: Record<string, string>; path: string;
}) {
  function href(nextPage: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
    search.set("page", String(nextPage));
    return `${path}?${search.toString()}`;
  }
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
