import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deactivateClient } from "../actions";
import { DeactivateClientButton } from "../deactivate-client-button";
import { clientIdSchema, getClientIdLabel } from "@/lib/admin/clients";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Client details" };
export const dynamic = "force-dynamic";

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0 border-b border-border py-3">
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words text-sm text-text">{value || "—"}</dd>
    </div>
  );
}

export default async function ClientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = clientIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const client = await prisma.client.findUnique({ where: { id: parsedId.data } });

  if (!client) notFound();

  const address = [
    client.streetAddress || client.address,
    client.municipality,
    client.wardNumber ? `Ward ${client.wardNumber}` : null,
    client.district,
    client.province,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-sm font-medium text-secondary hover:text-primary"
          href="/admin/clients"
        >
          ← All clients
        </Link>
        <div className="flex items-center gap-2">
          <Link
            className="button button-secondary"
            href={`/admin/clients/${client.id}/edit`}
          >
            Edit client
          </Link>
          {client.isActive && (
            <DeactivateClientButton
              action={deactivateClient.bind(null, client.id)}
            />
          )}
        </div>
      </div>

      <section className="border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
              {client.type === "BUSINESS" ? "Business client" : "Individual client"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-primary sm:text-2xl">
              {client.displayName}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {getClientIdLabel(client.id)}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              client.isActive ? "text-success" : "text-text-secondary"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${
                client.isActive ? "bg-success" : "bg-text-secondary"
              }`}
            />
            {client.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Contact person" value={client.contactPerson} />
          <Detail label="Mobile number" value={client.phone} />
          <Detail label="Email address" value={client.email} />
          <Detail label="PAN number" value={client.panNumber} />
          <Detail
            label="VAT registration"
            value={client.vatRegistered ? "Registered" : "Not registered"}
          />
          <Detail label="VAT number" value={client.vatNumber} />
          <Detail label="Address" value={address} />
          <Detail
            label="Registration date"
            value={
              client.registrationDate
                ? client.registrationDate.toLocaleDateString("en-NP", {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  })
                : null
            }
          />
          <Detail
            label="Created date"
            value={client.createdAt.toLocaleDateString("en-NP", {
              dateStyle: "medium",
            })}
          />
          <Detail
            label="Last updated"
            value={client.updatedAt.toLocaleDateString("en-NP", {
              dateStyle: "medium",
            })}
          />
        </div>
        <div className="mt-5">
          <h3 className="text-xs font-medium text-text-secondary">Client notes</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text">
            {client.notes || "No notes have been added."}
          </p>
        </div>
      </section>
    </div>
  );
}
