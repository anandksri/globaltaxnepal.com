import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { updateComplianceTask } from "../../../actions";
import { ComplianceTaskForm } from "../../../tax-forms";
import { getComplianceFormData } from "@/lib/admin/tax";
import { requireSuperAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Edit compliance task" };
export const dynamic = "force-dynamic";

export default async function EditComplianceTaskPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const data = await getComplianceFormData(parsed.data);
  if (!data?.initial) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/tax/compliance/${parsed.data}`}>← Compliance task</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <ComplianceTaskForm action={updateComplianceTask.bind(null, parsed.data)} clients={data.clients} documents={data.documents} initial={data.initial} staff={data.staff} />
      </section>
    </div>
  );
}
