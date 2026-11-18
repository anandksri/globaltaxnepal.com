"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentActionState } from "./actions";

type CategoryOption = { value: string; label: string };
type ClientOption = { id: string; displayName: string };
type MetadataAction = (
  state: DocumentActionState,
  formData: FormData,
) => Promise<DocumentActionState>;

type DocumentValues = {
  title: string;
  category: string;
  clientId: string;
  description: string;
};

export function DocumentUploadForm({
  categories,
  clients,
}: {
  categories: readonly CategoryOption[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/admin/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) {
        setError(result.error || "The document could not be uploaded.");
        return;
      }
      router.push(`/admin/documents/${result.id}`);
      router.refresh();
    } catch {
      setError("The upload could not be completed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="space-y-5">
      {error && <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">{error}</p>}
      <MetadataFields categories={categories} clients={clients} />
      <div>
        <label className="form-label" htmlFor="document-file">File <span className="font-normal text-text-secondary">(PDF, JPG, PNG, or WebP; up to 10 MB)</span></label>
        <input
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="form-control file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          id="document-file"
          name="file"
          required
          type="file"
        />
      </div>
      <div className="flex justify-end border-t border-border pt-4">
        <button className="button button-primary" disabled={pending} type="submit">{pending ? "Uploading…" : "Upload document"}</button>
      </div>
    </form>
  );
}

export function DocumentMetadataForm({
  action,
  categories,
  clients,
  initial,
}: {
  action: MetadataAction;
  categories: readonly CategoryOption[];
  clients: ClientOption[];
  initial: DocumentValues;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5">
      {state.error && <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">{state.error}</p>}
      <MetadataFields categories={categories} clients={clients} initial={initial} fieldErrors={state.fieldErrors} />
      <div className="flex justify-end border-t border-border pt-4">
        <button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save details"}</button>
      </div>
    </form>
  );
}

function MetadataFields({
  categories,
  clients,
  initial,
  fieldErrors = {},
}: {
  categories: readonly CategoryOption[];
  clients: ClientOption[];
  initial?: DocumentValues;
  fieldErrors?: Record<string, string>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="form-label" htmlFor="document-title">Document title</label>
        <input className="form-control" id="document-title" maxLength={200} name="title" onChange={(event) => setTitle(event.target.value)} required value={title} />
        {fieldErrors.title && <p className="form-hint form-hint-error">{fieldErrors.title}</p>}
      </div>
      <div>
        <label className="form-label" htmlFor="document-category">Category</label>
        <select className="form-control" id="document-category" name="category" onChange={(event) => setCategory(event.target.value)} required value={category}>
          <option value="">Select category</option>
          {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {fieldErrors.category && <p className="form-hint form-hint-error">{fieldErrors.category}</p>}
      </div>
      <div className="sm:col-span-2">
        <label className="form-label" htmlFor="document-client">Linked client <span className="font-normal text-text-secondary">(optional)</span></label>
        <select className="form-control" id="document-client" name="clientId" onChange={(event) => setClientId(event.target.value)} value={clientId}>
          <option value="">No client selected</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.displayName}</option>)}
        </select>
        {fieldErrors.clientId && <p className="form-hint form-hint-error">{fieldErrors.clientId}</p>}
      </div>
      <div className="sm:col-span-2">
        <label className="form-label" htmlFor="document-description">Description <span className="font-normal text-text-secondary">(optional)</span></label>
        <textarea className="form-control min-h-24" id="document-description" maxLength={1000} name="description" onChange={(event) => setDescription(event.target.value)} value={description} />
        {fieldErrors.description && <p className="form-hint form-hint-error">{fieldErrors.description}</p>}
      </div>
    </div>
  );
}
