import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DeleteAccountRecordForm } from "../../account-controls";
import { deleteExpense } from "../../actions";
import { getExpenseRecord } from "@/lib/admin/accounts";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Expense details" };
export const dynamic = "force-dynamic";

export default async function ExpenseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const [record, settings] = await Promise.all([
    getExpenseRecord(parsed.data),
    prisma.companySettings.findUnique({ where: { id: "company" }, select: { currencyCode: true } }),
  ]);
  if (!record) notFound();
  const currencyCode = settings?.currencyCode ?? "NPR";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/accounts/expenses">← Expense records</Link>
        <Link className="button button-secondary" href={`/admin/accounts/expenses/${record.id}/edit`}>Edit record</Link>
      </div>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Expense reference</p>
            <h2 className="mt-1 text-xl font-semibold text-primary">{record.referenceNumber}</h2>
          </div>
          <p className="text-xl font-semibold text-primary">{formatCurrency(moneyToCents(record.amount.toFixed(2)), currencyCode)}</p>
        </div>
        <dl className="grid gap-x-6 gap-y-4 py-5 sm:grid-cols-2">
          <Detail label="Expense date" value={record.expenseDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })} />
          <Detail label="Category" value={record.category.name} />
          <Detail label="Paid to / vendor" value={record.paidTo} />
          <Detail label="Payment method" value={record.method.replaceAll("_", " ")} />
          <Detail label="Reference number" value={record.reference ?? "—"} />
          <Detail label="Description" value={record.description} />
          <Detail label="Created by" value={record.createdBy.name ?? record.createdBy.email} />
          <Detail label="Last updated" value={record.updatedAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })} />
        </dl>
        {record.sourcePaymentVoucher && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-primary">Linked source</h3>
            <Link className="mt-2 inline-block text-sm font-medium text-secondary hover:text-primary" href={`/admin/payment-vouchers/${record.sourcePaymentVoucher.id}`}>Payment voucher · {record.sourcePaymentVoucher.voucherNumber}</Link>
          </div>
        )}
      </section>
      <DeleteAccountRecordForm action={deleteExpense.bind(null, record.id)} label="Expense" />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</dt><dd className="mt-1 break-words text-sm text-primary">{value}</dd></div>;
}
