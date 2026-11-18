import type { Metadata } from "next";
import { VoucherList } from "../vouchers/voucher-list";
import { listPaymentVouchers } from "@/lib/admin/vouchers";

export const metadata: Metadata = { title: "Payment vouchers" };
export const dynamic = "force-dynamic";

export default async function PaymentVouchersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await listPaymentVouchers(await searchParams);
  return <VoucherList kind="payment" {...result} />;
}
