import type { Metadata } from "next";
import Link from "next/link";
import { VoucherForm } from "../../vouchers/voucher-form";
import { createPaymentVoucher } from "../../vouchers/actions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "New payment voucher" };
export const dynamic = "force-dynamic";

export default async function NewPaymentVoucherPage() {
  await requirePermission("VOUCHERS", "CREATE");
  const settings = await prisma.companySettings.findUnique({
    where: { id: "company" },
    select: { currencyCode: true },
  });
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/payment-vouchers">← All payment vouchers</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <VoucherForm action={createPaymentVoucher} currencyCode={settings?.currencyCode ?? "NPR"} kind="payment" />
      </section>
    </div>
  );
}
