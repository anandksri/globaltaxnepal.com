import type { Metadata } from "next";
import Link from "next/link";
import { VoucherForm } from "../../vouchers/voucher-form";
import { createReceiptVoucher } from "../../vouchers/actions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "New receipt voucher" };
export const dynamic = "force-dynamic";

export default async function NewReceiptVoucherPage() {
  await requirePermission("VOUCHERS", "CREATE");
  const [clients, settings] = await prisma.$transaction([
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
    prisma.companySettings.findUnique({ where: { id: "company" }, select: { currencyCode: true } }),
  ]);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/receipt-vouchers">← All receipt vouchers</Link>
      {clients.length === 0 ? (
        <section className="border border-border bg-surface px-5 py-10 text-center">
          <h2 className="font-semibold text-primary">An active client is required</h2>
          <Link className="button button-primary mt-4" href="/admin/clients/new">Add client</Link>
        </section>
      ) : (
        <section className="border border-border bg-surface p-5 sm:p-7">
          <VoucherForm action={createReceiptVoucher} clients={clients} currencyCode={settings?.currencyCode ?? "NPR"} kind="receipt" />
        </section>
      )}
    </div>
  );
}
