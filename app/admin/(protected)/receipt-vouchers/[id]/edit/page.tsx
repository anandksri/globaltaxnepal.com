import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { updateReceiptVoucher } from "../../../vouchers/actions";
import { VoucherForm } from "../../../vouchers/voucher-form";
import { getReceiptVoucherEditData } from "@/lib/admin/vouchers";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Edit receipt voucher" };
export const dynamic = "force-dynamic";

export default async function EditReceiptVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("VOUCHERS", "EDIT");
  const { id } = await params;
  const validId = z.string().min(1).max(191).safeParse(id);
  if (!validId.success) notFound();
  const data = await getReceiptVoucherEditData(validId.data);
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/receipt-vouchers/${data.voucher.id}`}>← Voucher {data.voucher.voucherNumber}</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Voucher number: <strong className="text-primary">{data.voucher.voucherNumber}</strong></p>
        <VoucherForm
          action={updateReceiptVoucher.bind(null, data.voucher.id)}
          clients={data.clients}
          currencyCode={data.voucher.currencyCode}
          initial={{
            voucherDate: data.voucher.voucherDate.toISOString().slice(0, 10),
            amount: data.voucher.amount.toFixed(2),
            method: data.voucher.method,
            reference: data.voucher.reference ?? "",
            clientId: data.voucher.clientId,
            description: data.voucher.description,
          }}
          kind="receipt"
        />
      </section>
    </div>
  );
}
