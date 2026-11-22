import type { Metadata } from "next";
import Link from "next/link";
import { createExpense } from "../../actions";
import { AccountForm } from "../../account-form";
import { getExpenseFormData } from "@/lib/admin/accounts";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Add expense" };
export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  await requirePermission("ACCOUNTS", "CREATE");
  const [data, settings] = await Promise.all([
    getExpenseFormData(),
    prisma.companySettings.findUnique({ where: { id: "company" }, select: { currencyCode: true } }),
  ]);
  if (!data) throw new Error("Unable to load expense form data.");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/accounts/expenses">← Expense records</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Expense reference is generated when the record is saved. Link a payment voucher to avoid counting it twice.</p>
        <AccountForm action={createExpense} categories={data.categories} currencyCode={settings?.currencyCode ?? "NPR"} kind="expense" paymentSources={data.paymentSources} />
      </section>
    </div>
  );
}
