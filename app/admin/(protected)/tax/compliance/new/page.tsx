import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createComplianceTask } from "../../actions";
import { ComplianceTaskForm } from "../../tax-forms";
import { getComplianceFormData } from "@/lib/admin/tax";

export const metadata: Metadata = { title: "Create compliance task" };
export const dynamic = "force-dynamic";

export default async function NewComplianceTaskPage() {
  const data = await getComplianceFormData();
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/tax/compliance">← Compliance tasks</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Set a task-specific due date and category. No legal deadlines are preconfigured.</p>
        <ComplianceTaskForm action={createComplianceTask} clients={data.clients} documents={data.documents} staff={data.staff} />
      </section>
    </div>
  );
}
