"use client";

import { startTransition, useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { registerDefinitions, type RegisterData, type RegisterDefinition, type RegisterField, type RegisterKind } from "@/lib/admin/office-registers";
import type { RegisterActionState } from "./actions";

export type RegisterOptions = {
  clients: Array<{ id: string; label: string }>;
  staff: Array<{ id: string; label: string }>;
  tasks: Array<{ id: string; label: string; clientId: string | null; status: string }>;
  documents: Array<{ id: string; label: string; clientId: string | null }>;
};

function emptyRow(fields: readonly RegisterField[]) {
  return Object.fromEntries(fields.map((field) => [field.key, ""]));
}

export function RegisterForm({
  kind,
  action,
  options,
  initial,
}: {
  kind: RegisterKind;
  action: (state: RegisterActionState, data: FormData) => Promise<RegisterActionState>;
  options: RegisterOptions;
  initial?: { title: string; clientId: string; data: RegisterData };
}) {
  const definition: RegisterDefinition = registerDefinitions[kind];
  const [state, formAction, pending] = useActionState(action, {});
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [data, setData] = useState<RegisterData>(() =>
    initial?.data ?? Object.fromEntries(definition.sections.map((section) => [
      section.key,
      section.repeat ? [] : [emptyRow(section.fields)],
    ])),
  );

  function setField(section: string, index: number, key: string, value: string) {
    setData((current) => ({
      ...current,
      [section]: current[section].map((row, i) => i === index ? { ...row, [key]: value } : row),
    }));
  }

  function changeClient(value: string) {
    setClientId(value);
    if (!value) return;
    setData((current) => Object.fromEntries(definition.sections.map((section) => [
      section.key,
      current[section.key].map((row) => {
        const updated = { ...row };
        for (const field of section.fields) {
          const choices = field.type === "task" ? options.tasks : field.type === "document" ? options.documents : null;
          if (choices && updated[field.key] && !choices.some((choice) => choice.id === updated[field.key] && choice.clientId === value)) {
            updated[field.key] = "";
          }
        }
        return updated;
      }),
    ])));
  }

  return (
    <form action={formAction} className="space-y-6" onSubmit={(event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      startTransition(() => formAction(formData));
    }}>
      <input name="kind" type="hidden" value={kind} />
      <input name="data" type="hidden" value={JSON.stringify(data)} />
      {state.error && <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">{state.error}</p>}
      <section className="border border-border bg-surface p-5 sm:p-7">
        <h2 className="border-b border-border pb-3 font-semibold text-primary">{definition.title}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="register-title">Register title *</label>
            <input className="form-control" id="register-title" maxLength={200} name="title" onChange={(event) => setTitle(event.target.value)} required value={title} />
          </div>
          <div>
            <label className="form-label" htmlFor="register-client">Client{definition.clientRequired ? " *" : " (optional)"}</label>
            <select className="form-control" id="register-client" name="clientId" onChange={(event) => changeClient(event.target.value)} required={definition.clientRequired} value={clientId}>
              <option value="">Select a client</option>
              {options.clients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-3 text-sm text-text-secondary">Tasks, documents and staff are linked to existing records. Task status and billing are not changed here.</p>
      </section>

      {definition.sections.map((section) => (
        <section aria-labelledby={`register-section-${section.key}`} className="border border-border bg-surface p-5 sm:p-7" key={section.key}>
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <h2 className="font-semibold text-primary" id={`register-section-${section.key}`}>{section.label}</h2>
            {section.repeat && (
              <button
                className="button button-secondary"
                disabled={data[section.key].length >= 50}
                onClick={() => setData((current) => ({
                  ...current,
                  [section.key]: [...current[section.key], emptyRow(section.fields)],
                }))}
                type="button"
              >
                <Plus aria-hidden="true" size={16} /> Add
              </button>
            )}
          </div>
          {section.repeat && data[section.key].length === 0 && <p className="mt-4 text-sm text-text-secondary">No entries added.</p>}
          <div className="mt-4 space-y-4">
            {data[section.key].map((row, index) => (
              <div className={section.repeat ? "border border-border p-4" : ""} key={index}>
                {section.repeat && <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-primary">Entry {index + 1}</h3>
                  <button
                    aria-label={`Remove ${section.label} entry ${index + 1}`}
                    className="button button-secondary !px-3"
                    onClick={() => setData((current) => ({
                      ...current,
                      [section.key]: current[section.key].filter((_, i) => i !== index),
                    }))}
                    type="button"
                  ><X aria-hidden="true" size={16} /></button>
                </div>}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.fields.map((field) => {
                    const id = `${section.key}-${index}-${field.key}`;
                    const value = row[field.key] ?? "";
                    const update = (newValue: string) => setField(section.key, index, field.key, newValue);
                    const choices = field.type === "staff" ? options.staff
                      : field.type === "task" ? options.tasks.filter((item) => !clientId || item.clientId === clientId)
                      : field.type === "document" ? options.documents.filter((item) => !clientId || item.clientId === clientId)
                      : field.type === "select" ? (field.options ?? []).map((option) => ({ id: option, label: option }))
                      : null;
                    return <div key={field.key}>
                      <label className="form-label" htmlFor={id}>{field.label}{field.required && " *"}</label>
                      {choices ? (
                        <select className="form-control" id={id} onChange={(event) => update(event.target.value)} required={field.required} value={value}>
                          <option value="">Select</option>
                          {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
                        </select>
                      ) : field.type === "textarea" ? (
                        <textarea className="form-control min-h-20" id={id} maxLength={5000} onChange={(event) => update(event.target.value)} value={value} />
                      ) : (
                        <input className="form-control" id={id} maxLength={field.type === "text" || !field.type ? 200 : undefined} min={field.type === "number" || field.type === "integer" ? "0" : undefined} onChange={(event) => update(event.target.value)} required={field.required} step={field.type === "number" ? "0.01" : field.type === "integer" ? "1" : undefined} type={field.type === "integer" ? "number" : field.type ?? "text"} value={value} />
                      )}
                    </div>;
                  })}
                </div>
                {kind === "staff-time" && section.key === "entries" && row.start && row.end && (
                  <p className="mt-3 text-sm text-text-secondary">
                    Total time: {formatDuration(row.start, row.end)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="flex justify-end gap-3">
        <a className="button button-secondary" href={`/admin/students/registers/${kind}`}>Cancel</a>
        <button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save register"}</button>
      </div>
    </form>
  );
}

export function formatDuration(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  return minutes > 0 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : "End time must be later than start time";
}
