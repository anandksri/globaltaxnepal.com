import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { updateTaxRecord } from "../../../actions";
import { TaxRecordForm } from "../../../tax-forms";
import { getTaxFormData } from "@/lib/admin/tax";

export const metadata: Metadata = { title: "Edit tax record" };
export const dynamic = "force-dynamic";

export default async function EditTaxRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const data = await getTaxFormData(parsed.data);
  if (!data?.initial) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/tax/records/${parsed.data}`}>← Tax record</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">PAN and VAT values follow the selected client's current profile.</p>
        <TaxRecordForm action={updateTaxRecord.bind(null, parsed.data)} clients={data.clients} documents={data.documents} initial={data.initial} />
      </section>
    </div>
  );
}
