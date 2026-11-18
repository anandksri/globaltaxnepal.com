import type { Metadata } from "next";
import { AccountList } from "../account-list";
import { AddCategoryForm } from "../account-controls";
import { createExpenseCategory } from "../actions";
import { listExpenseRecords } from "@/lib/admin/accounts";

export const metadata: Metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await listExpenseRecords(await searchParams);
  return (
    <div className="space-y-5">
      <AccountList type="expenses" {...result} />
      <AddCategoryForm action={createExpenseCategory} label="Expense" />
    </div>
  );
}
