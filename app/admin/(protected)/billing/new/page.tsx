import type { Metadata } from "next";
import Link from "next/link";
import { createBill } from "../actions";
import { BillForm } from "../bill-form";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Create a bill" };
export const dynamic = "force-dynamic";

export default async function NewBillPage() {
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
    prisma.companySettings.findUnique({
      where: { id: "company" },
      select: { currencyCode: true },
    }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/billing">
        ← All bills
      </Link>
      {clients.length === 0 ? (
        <section className="border border-border bg-surface px-5 py-10 text-center">
          <h2 className="font-semibold text-primary">An active client is required</h2>
          <p className="mt-1 text-sm text-text-secondary">Add a client before creating a bill.</p>
          <Link className="button button-primary mt-4" href="/admin/clients/new">Add client</Link>
        </section>
      ) : (
        <section className="border border-border bg-surface p-5 sm:p-7">
          <BillForm
            action={createBill}
            clients={clients}
            currencyCode={settings?.currencyCode ?? "NPR"}
            today={today}
          />
        </section>
      )}
    </div>
  );
}
