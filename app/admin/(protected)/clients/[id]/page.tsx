import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminModule, PermissionAction, Prisma } from "@prisma/client";
import { deactivateClient } from "../actions";
import { DeactivateClientButton } from "../deactivate-client-button";
import { clientIdSchema, getClientIdLabel } from "@/lib/admin/clients";
import { requirePermission } from "@/lib/admin/auth";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
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
  const admin = await requirePermission(AdminModule.CLIENTS, PermissionAction.VIEW);
  const { id } = await params;
  const parsedId = clientIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const [client, bills, receipts, documents, taxRecords, complianceTasks] = await Promise.all([
    prisma.client.findUnique({ where: { id: parsedId.data } }),
    mayView(admin, AdminModule.BILLING)
      ? prisma.bill.findMany({
          where: { clientId: parsedId.data },
          orderBy: [{ billDate: "desc" }, { createdAt: "desc" }],
          take: 8,
          select: {
            id: true, billNumber: true, billType: true, billDate: true, status: true,
            currencyCode: true, totalAmount: true, payments: { select: { amount: true } },
          },
        })
      : Promise.resolve([]),
    mayView(admin, AdminModule.VOUCHERS)
      ? prisma.receiptVoucher.findMany({
          where: { clientId: parsedId.data },
          orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
          take: 8,
          select: { id: true, voucherNumber: true, voucherDate: true, amount: true, currencyCode: true },
        })
      : Promise.resolve([]),
    mayView(admin, AdminModule.DOCUMENTS)
      ? prisma.document.findMany({
          where: { clientId: parsedId.data },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, title: true, category: true, createdAt: true },
        })
      : Promise.resolve([]),
    mayView(admin, AdminModule.TAX)
      ? prisma.clientTaxRecord.findMany({
          where: { clientId: parsedId.data },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: 8,
          select: { id: true, taxPeriod: true, taxType: true, filingStatus: true, dueDate: true },
        })
      : Promise.resolve([]),
    mayView(admin, AdminModule.TAX)
      ? prisma.complianceTask.findMany({
          where: { clientId: parsedId.data },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: 8,
          select: { id: true, title: true, status: true, dueDate: true },
        })
      : Promise.resolve([]),
  ]);

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
          {mayEdit(admin, AdminModule.CLIENTS) && <Link
            className="button button-secondary"
            href={`/admin/clients/${client.id}/edit`}
          >
            Edit client
          </Link>}
          {client.isActive && mayEdit(admin, AdminModule.CLIENTS, PermissionAction.DELETE) && (
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
      {mayView(admin, AdminModule.BILLING) && (
        <section className="border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-semibold text-primary">Bills</h2>
            <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/billing?client=${encodeURIComponent(client.id)}`}>All billing</Link>
          </div>
          {bills.length === 0 ? <p className="px-5 py-6 text-sm text-text-secondary">No bills are linked to this client.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-4 py-3">Bill</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Billed</th><th className="px-4 py-3 text-right">Balance</th></tr></thead>
                <tbody className="divide-y divide-border">{bills.map((bill) => {
                  const paid = bill.payments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
                  const outstanding = bill.status === "DRAFT" || bill.status === "CANCELLED" ? new Prisma.Decimal(0) : bill.totalAmount.sub(paid);
                  return <tr key={bill.id}>
                    <td className="px-4 py-3"><Link className="font-medium text-secondary hover:text-primary" href={bill.billType === "DETAILS" ? `/admin/details-bills/${bill.id}` : `/admin/billing/${bill.id}`}>{bill.billNumber}</Link></td>
                    <td className="whitespace-nowrap px-4 py-3">{bill.billDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</td>
                    <td className="px-4 py-3">{bill.billType === "DETAILS" ? "Details bill" : "Normal bill"}</td>
                    <td className="px-4 py-3">{bill.status.replaceAll("_", " ")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(bill.totalAmount.toFixed(2)), bill.currencyCode)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(moneyToCents(outstanding.toFixed(2)), bill.currencyCode)}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {mayView(admin, AdminModule.VOUCHERS) && (
        <section className="border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-4 font-semibold text-primary">Receipt vouchers</h2>
          {receipts.length === 0 ? <p className="px-5 py-6 text-sm text-text-secondary">No receipt vouchers are linked to this client.</p> : (
            <ul className="divide-y divide-border">{receipts.map((receipt) => <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm" key={receipt.id}>
              <div><Link className="font-medium text-secondary hover:text-primary" href={`/admin/receipt-vouchers/${receipt.id}`}>{receipt.voucherNumber}</Link><p className="mt-1 text-xs text-text-secondary">{receipt.voucherDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</p></div>
              <span className="font-medium text-primary">{formatCurrency(moneyToCents(receipt.amount.toFixed(2)), receipt.currencyCode)}</span>
            </li>)}</ul>
          )}
        </section>
      )}
      {mayView(admin, AdminModule.DOCUMENTS) && (
        <section className="border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-semibold text-primary">Documents</h2>
            <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/documents?client=${encodeURIComponent(client.id)}`}>All documents</Link>
          </div>
          {documents.length === 0 ? <p className="px-5 py-6 text-sm text-text-secondary">No documents are linked to this client.</p> : (
            <ul className="divide-y divide-border">{documents.map((document) => <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm" key={document.id}>
              <Link className="font-medium text-secondary hover:text-primary" href={`/admin/documents/${document.id}`}>{document.title}</Link>
              <span className="text-text-secondary">{document.category.replaceAll("_", " ")}</span>
            </li>)}</ul>
          )}
        </section>
      )}
      {mayView(admin, AdminModule.TAX) && (
        <section className="grid gap-5 lg:grid-cols-2">
          <RelatedList title="Tax records" emptyText="No tax records are linked to this client." items={taxRecords.map((record) => ({
            id: record.id,
            href: `/admin/tax/records/${record.id}`,
            label: `${record.taxType} · ${record.taxPeriod}`,
            status: record.filingStatus.replaceAll("_", " "),
          }))} />
          <RelatedList title="Compliance tasks" emptyText="No compliance tasks are linked to this client." items={complianceTasks.map((task) => ({
            id: task.id,
            href: `/admin/tax/compliance/${task.id}`,
            label: task.title,
            status: task.status.replaceAll("_", " "),
          }))} />
        </section>
      )}
    </div>
  );
}

function mayView(admin: Awaited<ReturnType<typeof requirePermission>>, module: AdminModule) {
  return admin.roleName === "SUPER_ADMIN" || admin.permissions.some((permission) =>
    permission.module === module && permission.action === PermissionAction.VIEW
  );
}

function mayEdit(
  admin: Awaited<ReturnType<typeof requirePermission>>,
  module: AdminModule,
  action: PermissionAction = PermissionAction.EDIT,
) {
  return admin.roleName === "SUPER_ADMIN" || admin.permissions.some((permission) =>
    permission.module === module && permission.action === action
  );
}

function RelatedList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{ id: string; href: string; label: string; status: string }>;
}) {
  return <section className="border border-border bg-surface">
    <h2 className="border-b border-border px-5 py-4 font-semibold text-primary">{title}</h2>
    {items.length === 0 ? <p className="px-5 py-6 text-sm text-text-secondary">{emptyText}</p> : <ul className="divide-y divide-border">{items.map((item) => <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm" key={item.id}>
      <Link className="font-medium text-secondary hover:text-primary" href={item.href}>{item.label}</Link><span className="text-text-secondary">{item.status}</span>
    </li>)}</ul>}
  </section>;
}
