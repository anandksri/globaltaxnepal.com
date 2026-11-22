import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { z } from "zod";
import { PrintVoucherButton } from "../../vouchers/voucher-controls";
import { VoucherDocument } from "../../vouchers/voucher-document";
import { getPaymentVoucher } from "@/lib/admin/vouchers";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Payment voucher" };
export const dynamic = "force-dynamic";

export default async function PaymentVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const validId = z.string().min(1).max(191).safeParse(id);
  if (!validId.success) notFound();
  const [voucher, company] = await Promise.all([
    getPaymentVoucher(validId.data),
    prisma.companySettings.findUnique({ where: { id: "company" } }),
  ]);
  if (!voucher) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/payment-vouchers">← All payment vouchers</Link>
        <div className="flex gap-2">
          <Link className="button button-secondary" href={`/admin/payment-vouchers/${voucher.id}/edit`}><Pencil aria-hidden="true" className="size-4" strokeWidth={1.75} />Edit voucher</Link>
          <PrintVoucherButton />
        </div>
      </div>
      <VoucherDocument
        amount={voucher.amount.toFixed(2)}
        company={company}
        currencyCode={voucher.currencyCode}
        date={voucher.voucherDate}
        description={voucher.purpose}
        descriptionLabel="Purpose"
        method={voucher.method}
        party={voucher.payeeName}
        partyLabel="Paid to"
        reference={voucher.reference}
        title="Payment Voucher"
        voucherNumber={voucher.voucherNumber}
      />
      <p className="text-sm text-text-secondary print:hidden">Recorded by {voucher.createdBy.name || voucher.createdBy.email} · {voucher.createdAt.toLocaleDateString("en-NP", { dateStyle: "medium" })}</p>
    </div>
  );
}
