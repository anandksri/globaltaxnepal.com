import type { Metadata } from "next";
import { VoucherList } from "../vouchers/voucher-list";
import { listReceiptVouchers } from "@/lib/admin/vouchers";

export const metadata: Metadata = { title: "Receipt vouchers" };
export const dynamic = "force-dynamic";

export default async function ReceiptVouchersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await listReceiptVouchers(await searchParams);
  return <VoucherList kind="receipt" {...result} />;
}
