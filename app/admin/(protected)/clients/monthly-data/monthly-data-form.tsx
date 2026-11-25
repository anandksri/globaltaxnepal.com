"use client";

import { startTransition, useActionState, useState } from "react";
import { nepaliMonths, type MonthlyDates } from "@/lib/admin/client-monthly-data";
import type { MonthlyActionState } from "./actions";

export function MonthlyDataForm({ action, canEdit, canUpload, clientId, dates, documents, remarks, selected, manualClient }: {
  action: (state: MonthlyActionState, data: FormData) => Promise<MonthlyActionState>;
  canEdit: boolean;
  canUpload: boolean;
  clientId: string;
  dates: MonthlyDates;
  documents: Array<{ id: string; title: string }>;
  remarks: string;
  selected: string[];
  manualClient?: { displayName: string; phone: string; panNumber: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [available, setAvailable] = useState(documents);
  const [selectedIds, setSelectedIds] = useState(selected);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.set("title", file.name.slice(0, 200));
        formData.set("category", "OTHER");
        formData.set("clientId", clientId);
        formData.set("description", "");
        formData.set("file", file);
        const response = await fetch("/admin/documents/upload", { method: "POST", body: formData });
        const result: unknown = await response.json();
        if (!response.ok || !result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string") {
          const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error : "The document upload failed.";
          setUploadError(`${file.name}: ${message} Previously uploaded files remain available.`);
          break;
        }
        const document = { id: result.id, title: file.name.slice(0, 200) };
        setAvailable((current) => [document, ...current]);
        setSelectedIds((current) => [...current, document.id]);
      }
    } catch (error) {
      console.error("[client-monthly-data] Upload failed.", { name: error instanceof Error ? error.name : "UnknownError" });
      setUploadError("The upload could not be completed. Previously uploaded files remain available.");
    } finally {
      setUploading(false);
    }
  }

  return <form action={formAction} className="space-y-5" onSubmit={(event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }}>
    {state.error && <p className="border border-error/30 bg-error/5 p-3 text-sm text-error" role="alert">{state.error}</p>}
    {state.success && <p className="border border-success/30 p-3 text-sm text-success" role="status">{state.success}</p>}
    {manualClient && <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="font-semibold text-primary">Manual client details</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div><label className="mb-1.5 block text-sm font-semibold text-text" htmlFor="manual-name">Client name *</label><input className="form-control" defaultValue={manualClient.displayName} disabled={!canEdit} id="manual-name" maxLength={200} name="displayName" required /></div>
        <div><label className="mb-1.5 block text-sm font-semibold text-text" htmlFor="manual-phone">Mobile number</label><input className="form-control" defaultValue={manualClient.phone} disabled={!canEdit} id="manual-phone" maxLength={40} name="phone" type="tel" /></div>
        <div><label className="mb-1.5 block text-sm font-semibold text-text" htmlFor="manual-pan">PAN</label><input className="form-control" defaultValue={manualClient.panNumber} disabled={!canEdit} id="manual-pan" maxLength={20} name="panNumber" /></div>
      </div>
    </section>}
    <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="font-semibold text-primary">Monthly dates (BS)</h2>
      <p className="mt-2 text-sm text-text-secondary">Use YYYY-MM-DD in Bikram Sambat, with the month shown below. The day is checked from 01 to 32; verify the exact date against a Nepali calendar. These fields store one date per month; updating replaces the previous date.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nepaliMonths.map((month) => <div key={month.key}>
          <label className="mb-1.5 block text-sm font-semibold text-text" htmlFor={month.key}>{month.label} ({month.number})</label>
          <input className="form-control" defaultValue={dates[month.key]} disabled={!canEdit} id={month.key} maxLength={10} name={month.key} placeholder={`2083-${month.number}-01`} />
        </div>)}
      </div>
      <div className="mt-5">
        <label className="mb-1.5 block text-sm font-semibold text-text" htmlFor="monthly-remarks">Remarks</label>
        <textarea className="form-control min-h-24" defaultValue={remarks} disabled={!canEdit} id="monthly-remarks" maxLength={5000} name="remarks" />
      </div>
    </section>
    <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="font-semibold text-primary">Documents</h2>
      <p className="mt-2 text-sm text-text-secondary">{manualClient ? "Select documents without a linked client." : "Select existing client documents to link."} Uploaded files are saved to Documents immediately; save this form to link them here.</p>
      {canEdit && canUpload && <div className="mt-4">
        <label className="form-label" htmlFor="monthly-upload">Add documents</label>
        <input accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={uploading || pending} id="monthly-upload" multiple onChange={(event) => {
          const files = event.target.files;
          void uploadFiles(files);
          event.target.value = "";
        }} type="file" />
        <p className="mt-1 text-xs text-text-secondary">PDF, JPG, PNG or WebP; maximum 10 MB per file.</p>
      </div>}
      {uploading && <p className="mt-3 text-sm" role="status">Uploading documents…</p>}
      {uploadError && <p className="mt-3 text-sm text-error" role="alert">{uploadError}</p>}
      <ul className="mt-4 space-y-2">
        {available.filter((document) => canEdit || selectedIds.includes(document.id)).map((document) => <li className="flex items-center gap-2 text-sm" key={document.id}>
          {canEdit && <input checked={selectedIds.includes(document.id)} id={`document-${document.id}`} name="documentId" onChange={(event) => {
            const checked = event.target.checked;
            setSelectedIds((current) => checked ? [...current, document.id] : current.filter((id) => id !== document.id));
          }} type="checkbox" value={document.id} />}
          {canEdit && <label className="sr-only" htmlFor={`document-${document.id}`}>Link {document.title}</label>}
          <a className="text-secondary hover:text-primary" href={`/admin/documents/${document.id}/file?inline=1`} rel="noopener noreferrer" target="_blank">{document.title}</a>
        </li>)}
      </ul>
      {available.filter((document) => canEdit || selectedIds.includes(document.id)).length === 0 && <p className="mt-4 text-sm text-text-secondary">No documents available.</p>}
    </section>
    {canEdit && <div className="flex justify-end"><button className="button button-primary" disabled={pending || uploading} type="submit">{pending ? "Saving…" : "Save monthly data"}</button></div>}
  </form>;
}
