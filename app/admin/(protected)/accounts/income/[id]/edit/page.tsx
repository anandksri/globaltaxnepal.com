import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { updateIncome } from "../../../actions";
import { AccountForm } from "../../../account-form";
import { getIncomeFormData } from "@/lib/admin/accounts";

export const metadata: Metadata = { title: "Edit income" };
export const dynamic = "force-dynamic";

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const data = await getIncomeFormData(parsed.data);
  if (!data?.initial) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/accounts/income/${parsed.data}`}>← Income details</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Linked source transactions supply the date, amount, payment method, and client information.</p>
        <AccountForm
          action={updateIncome.bind(null, parsed.data)}
          categories={data.categories}
          clients={data.clients}
          initial={{
            date: data.initial.incomeDate,
            categoryId: data.initial.categoryId,
            description: data.initial.description,
            amount: data.initial.amount,
            currencyCode: data.initial.currencyCode,
            method: data.initial.method,
            clientId: data.initial.clientId,
            reference: data.initial.reference,
            sourcePaymentId: data.initial.sourcePaymentId,
            sourceReceiptVoucherId: data.initial.sourceReceiptVoucherId,
          }}
          kind="income"
          paymentSources={data.paymentSources}
          receiptSources={data.receiptSources}
        />
      </section>
    </div>
  );
}
