import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createTaxRecord } from "../../actions";
import { TaxRecordForm } from "../../tax-forms";
import { getTaxFormData } from "@/lib/admin/tax";

export const metadata: Metadata = { title: "Add client tax record" };
export const dynamic = "force-dynamic";

export default async function NewTaxRecordPage() {
  const data = await getTaxFormData();
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/tax/records">← Tax records</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">PAN and VAT details are copied from the selected client record. Tax period, tax type, and due date are entered by your administrator.</p>
        <TaxRecordForm action={createTaxRecord} clients={data.clients} documents={data.documents} />
      </section>
    </div>
  );
}
