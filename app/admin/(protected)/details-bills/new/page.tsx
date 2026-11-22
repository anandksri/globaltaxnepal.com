import type { Metadata } from "next";
import Link from "next/link";
import { createDetailsBill } from "../actions";
import { BillForm } from "@/app/admin/(protected)/billing/bill-form";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Create details bill" };
export const dynamic = "force-dynamic";

export default async function NewDetailsBillPage() {
  await requirePermission("BILLING", "CREATE");
  const [clients, settings] = await prisma.$transaction([
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        contactPerson: true,
        phone: true,
        email: true,
        panNumber: true,
        vatRegistered: true,
        vatNumber: true,
        province: true,
        district: true,
        municipality: true,
        wardNumber: true,
        streetAddress: true,
        address: true,
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "company" }, select: { currencyCode: true } }),
  ]);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/details-bills">← All details bills</Link>
      {clients.length === 0 ? (
        <section className="border border-border bg-surface px-5 py-10 text-center">
          <h2 className="font-semibold text-primary">An active client is required</h2>
          <p className="mt-1 text-sm text-text-secondary">Add a client before creating a details bill.</p>
          <Link className="button button-primary mt-4" href="/admin/clients/new">Add client</Link>
        </section>
      ) : (
        <section className="border border-border bg-surface p-5 sm:p-7">
          <BillForm
            action={createDetailsBill}
            clients={clients}
            currencyCode={settings?.currencyCode ?? "NPR"}
            today={new Date().toISOString().slice(0, 10)}
          />
        </section>
      )}
    </div>
  );
}
