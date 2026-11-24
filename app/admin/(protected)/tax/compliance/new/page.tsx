import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createComplianceTask } from "../../actions";
import { ComplianceTaskForm } from "../../tax-forms";
import { getComplianceFormData } from "@/lib/admin/tax";
import { requireSuperAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Create compliance task" };
export const dynamic = "force-dynamic";

export default async function NewComplianceTaskPage() {
  await requireSuperAdmin();
  const data = await getComplianceFormData();
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/tax/compliance">← Compliance tasks</Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <p className="mb-5 text-sm text-text-secondary">Select a staff member, add the task details and assignment note, then set a due date.</p>
        <ComplianceTaskForm action={createComplianceTask} clients={data.clients} documents={data.documents} staff={data.staff} />
      </section>
    </div>
  );
}
