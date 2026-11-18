import type { Metadata } from "next";
import { AccountList } from "../account-list";
import { AddCategoryForm } from "../account-controls";
import { createIncomeCategory } from "../actions";
import { listIncomeRecords } from "@/lib/admin/accounts";

export const metadata: Metadata = { title: "Income" };
export const dynamic = "force-dynamic";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await listIncomeRecords(await searchParams);
  return (
    <div className="space-y-5">
      <AccountList type="income" {...result} />
      <AddCategoryForm action={createIncomeCategory} label="Income" />
    </div>
  );
}
