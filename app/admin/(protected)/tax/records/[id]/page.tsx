import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { dueDateState, getTaxRecord } from "@/lib/admin/tax";

export const metadata: Metadata = { title: "Client tax record" };
export const dynamic = "force-dynamic";

export default async function TaxRecordDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.string().min(1).max(191).safeParse(id);
  if (!parsed.success) notFound();
  const record = await getTaxRecord(parsed.data);
  if (!record) notFound();
  const dateState = record.dueDate ? dueDateState(record.dueDate, record.filingStatus) : "upcoming";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/tax/records">← Tax records</Link>
        <Link className="button button-secondary" href={`/admin/tax/records/${record.id}/edit`}>Edit record</Link>
      </div>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{record.taxPeriod}</p>
            <h2 className="mt-1 text-xl font-semibold text-primary">{record.taxType}</h2>
            <Link className="mt-1 inline-block text-sm font-medium text-secondary hover:text-primary" href={`/admin/clients/${record.client.id}`}>{record.client.displayName}</Link>
          </div>
          <Status label={filingStatusLabel(record.filingStatus)} tone={record.filingStatus === "FILED" ? "success" : "neutral"} />
        </div>
        <dl className="grid gap-x-6 gap-y-4 py-5 sm:grid-cols-2">
          <Detail label="PAN number" value={record.panNumber ?? "—"} />
          <Detail label="VAT status" value={record.vatRegistered ? "Registered" : "Not registered"} />
          {record.vatRegistered && <Detail label="VAT number" value={record.vatNumber ?? "Not recorded"} />}
          <Detail label="Due date" value={record.dueDate?.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" }) ?? "Not set"} />
          <Detail label="Deadline status" value={record.dueDate ? statusLabel(dateState) : "No due date"} />
          <Detail label="Filing date" value={record.filingDate?.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" }) ?? "Not recorded"} />
          <div className="sm:col-span-2"><Detail label="Notes" value={record.notes || "—"} /></div>
        </dl>
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-primary">Related documents</h3>
          {record.documents.length === 0 ? <p className="mt-2 text-sm text-text-secondary">No documents linked.</p> : (
            <ul className="mt-2 space-y-2">
              {record.documents.map(({ document }) => <li key={document.id}><Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/documents/${document.id}`}>{document.title}<span className="ml-2 font-normal text-text-secondary">{document.originalName}</span></Link></li>)}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function filingStatusLabel(status: string) {
  return status === "FILED" ? "Filed" : status === "IN_PROGRESS" ? "In progress" : "Not filed";
}

function statusLabel(status: string) {
  return status === "overdue" ? "Overdue" : status === "due-soon" ? "Due soon" : "Upcoming";
}

function Status({ label, tone }: { label: string; tone: "success" | "neutral" }) {
  return <span className={`text-sm font-semibold ${tone === "success" ? "text-success" : "text-secondary"}`}>{label}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-primary">{value}</dd></div>;
}
