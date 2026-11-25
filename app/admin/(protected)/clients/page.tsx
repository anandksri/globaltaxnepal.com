import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deactivateClient } from "./actions";
import { DeactivateClientButton } from "./deactivate-client-button";
import { getClientIdLabel } from "@/lib/admin/clients";
import { prisma } from "@/lib/prisma";
import { Prisma, type ClientType } from "@prisma/client";

export const metadata: Metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

const pageSize = 20;

type SearchParams = Promise<{
  q?: string;
  type?: string;
  status?: string;
  page?: string;
}>;

function getPageHref(
  page: number,
  filters: { q: string; type: string; status: string },
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(page));
  return `/admin/clients?${params.toString()}`;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const type =
    params.type === "INDIVIDUAL" || params.type === "BUSINESS"
      ? params.type
      : "";
  const status =
    params.status === "active" || params.status === "inactive"
      ? params.status
      : "";
  const rawPage = Number.parseInt(params.page ?? "1", 10);
  const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters = { q, type, status };

  const where: Prisma.ClientWhereInput = {
    ...(type ? { type: type as ClientType } : {}),
    ...(status ? { isActive: status === "active" } : {}),
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { panNumber: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const total = await prisma.client.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const clients = await prisma.client.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      displayName: true,
      type: true,
      panNumber: true,
      phone: true,
      isActive: true,
    },
  });

  if (requestedPage > totalPages && total > 0) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Search and manage client records.
        </p>
        <Link className="button button-primary" href="/admin/clients/new">
          Add client
        </Link>
      </div>

      <form
        action="/admin/clients"
        className="admin-filter-grid border border-border bg-surface p-4"
        method="get"
      >
        <div>
          <label className="form-label" htmlFor="client-search">
            Search clients
          </label>
          <input
            className="form-control"
            defaultValue={q}
            id="client-search"
            maxLength={100}
            name="q"
            placeholder="Name, PAN, or mobile"
            type="search"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="client-type-filter">
            Client type
          </label>
          <select
            className="form-control"
            defaultValue={type}
            id="client-type-filter"
            name="type"
          >
            <option value="">All types</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="BUSINESS">Business</option>
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="client-status-filter">
            Status
          </label>
          <select
            className="form-control"
            defaultValue={status}
            id="client-status-filter"
            name="status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button className="button button-primary self-end" type="submit">
          Apply filters
        </button>
        <Link
          className="button button-secondary self-end"
          href="/admin/clients"
        >
          Clear
        </Link>
      </form>

      <section
        aria-label="Client list"
        className="overflow-hidden border border-border bg-surface"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">Client ID</th>
                <th className="px-4 py-3 font-semibold" scope="col">Client name</th>
                <th className="px-4 py-3 font-semibold" scope="col">Type</th>
                <th className="px-4 py-3 font-semibold" scope="col">PAN number</th>
                <th className="px-4 py-3 font-semibold" scope="col">Mobile number</th>
                <th className="px-4 py-3 font-semibold" scope="col">Status</th>
                <th className="px-4 py-3 font-semibold" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((client) => (
                <tr className="align-middle" key={client.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-text-secondary">
                    {getClientIdLabel(client.id)}
                  </td>
                  <td className="max-w-56 truncate px-4 py-3 font-medium text-primary">
                    <Link
                      className="hover:text-secondary"
                      href={`/admin/clients/${client.id}`}
                    >
                      {client.displayName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {client.type === "BUSINESS" ? "Business" : "Individual"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {client.panNumber || "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {client.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-2 text-xs font-medium ${
                        client.isActive ? "text-success" : "text-text-secondary"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${
                          client.isActive ? "bg-success" : "bg-text-secondary"
                        }`}
                      />
                      {client.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        className="font-medium text-secondary hover:text-primary"
                        href={`/admin/clients/${client.id}`}
                      >
                        View
                      </Link>
                      <Link
                        className="font-medium text-secondary hover:text-primary"
                        href={`/admin/clients/${client.id}/edit`}
                      >
                        Edit
                      </Link>
                      {client.isActive && (
                        <DeactivateClientButton
                          action={deactivateClient.bind(null, client.id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-primary">
                {q || type || status
                  ? "No clients match these filters."
                  : "No clients have been added yet."}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {q || type || status
                  ? "Try changing or clearing the search filters."
                  : "Add a client to begin organizing your records."}
              </p>
            </div>
          )}
        </div>
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-text-secondary">
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, total)} of {total}
            </p>
            <nav aria-label="Client list pages" className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  className="button button-secondary min-h-9 px-3 text-xs"
                  href={getPageHref(page - 1, filters)}
                >
                  Previous
                </Link>
              ) : (
                <span className="button button-secondary min-h-9 cursor-not-allowed px-3 text-xs opacity-50">
                  Previous
                </span>
              )}
              <span className="px-1 text-xs text-text-secondary">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  className="button button-secondary min-h-9 px-3 text-xs"
                  href={getPageHref(page + 1, filters)}
                >
                  Next
                </Link>
              ) : (
                <span className="button button-secondary min-h-9 cursor-not-allowed px-3 text-xs opacity-50">
                  Next
                </span>
              )}
            </nav>
          </div>
        )}
      </section>
    </div>
  );
}
