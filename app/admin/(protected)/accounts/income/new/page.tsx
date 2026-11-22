import type { Metadata } from "next";
import Link from "next/link";
import { createIncome } from "../../actions";
import { AccountForm } from "../../account-form";
import { getIncomeFormData } from "@/lib/admin/accounts";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Add income" };
export const dynamic = "force-dynamic";

export default async function NewIncomePage() {
  await requirePermission("ACCOUNTS", "CREATE");
  const [data, settings] = await Promise.all([
    getIncomeFormData(),
    prisma.companySettings.findUnique({ where: { id: "company" }, select: { currencyCode: true } }),
  ]);
  if (!data) throw new Error("Unable to load income form data.");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/accounts/income">← Income records</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Income reference is generated when the record is saved. Link an existing receipt to avoid counting it twice.</p>
        <AccountForm
          action={createIncome}
          categories={data.categories}
          clients={data.clients}
          currencyCode={settings?.currencyCode ?? "NPR"}
          kind="income"
          paymentSources={data.paymentSources}
          receiptSources={data.receiptSources}
        />
      </section>
    </div>
  );
}
