import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { updateExpense } from "../../../actions";
import { AccountForm } from "../../../account-form";
import { getExpenseFormData } from "@/lib/admin/accounts";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Edit expense" };
export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("ACCOUNTS", "EDIT");
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const data = await getExpenseFormData(parsed.data);
  if (!data?.initial) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/accounts/expenses/${parsed.data}`}>← Expense details</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Linked vouchers supply the date, amount, payment method, and payee information.</p>
        <AccountForm
          action={updateExpense.bind(null, parsed.data)}
          categories={data.categories}
          initial={{
            date: data.initial.expenseDate,
            categoryId: data.initial.categoryId,
            description: data.initial.description,
            amount: data.initial.amount,
            currencyCode: data.initial.currencyCode,
            method: data.initial.method,
            paidTo: data.initial.paidTo,
            reference: data.initial.reference,
            sourcePaymentVoucherId: data.initial.sourcePaymentVoucherId,
          }}
          kind="expense"
          paymentSources={data.paymentSources}
        />
      </section>
    </div>
  );
}
