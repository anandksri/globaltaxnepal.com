import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { updatePaymentVoucher } from "../../../vouchers/actions";
import { VoucherForm } from "../../../vouchers/voucher-form";
import { getPaymentVoucher } from "@/lib/admin/vouchers";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Edit payment voucher" };
export const dynamic = "force-dynamic";

export default async function EditPaymentVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("VOUCHERS", "EDIT");
  const { id } = await params;
  const validId = z.string().min(1).max(191).safeParse(id);
  if (!validId.success) notFound();
  const voucher = await getPaymentVoucher(validId.data);
  if (!voucher) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/payment-vouchers/${voucher.id}`}>← Voucher {voucher.voucherNumber}</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Voucher number: <strong className="text-primary">{voucher.voucherNumber}</strong></p>
        <VoucherForm
          action={updatePaymentVoucher.bind(null, voucher.id)}
          currencyCode={voucher.currencyCode}
          initial={{
            voucherDate: voucher.voucherDate.toISOString().slice(0, 10),
            amount: voucher.amount.toFixed(2),
            method: voucher.method,
            reference: voucher.reference ?? "",
            voucherNumber: voucher.voucherNumber,
            payeeName: voucher.payeeName,
            purpose: voucher.purpose,
          }}
          kind="payment"
        />
      </section>
    </div>
  );
}
