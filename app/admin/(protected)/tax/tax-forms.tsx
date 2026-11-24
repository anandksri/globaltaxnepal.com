"use client";

import { useActionState } from "react";
import type { TaxActionState } from "./actions";

type BoundAction = (state: TaxActionState, formData: FormData) => Promise<TaxActionState>;
type ClientOption = {
  id: string;
  displayName: string;
  panNumber?: string | null;
  vatRegistered?: boolean;
  vatNumber?: string | null;
};
type DocumentOption = { id: string; title: string; clientId: string | null; originalName: string };
type StaffOption = { id: string; name: string | null; email: string };
type TaxRecordInitial = {
  clientId: string; taxPeriod: string; taxType: string; filingStatus: string;
  filingDate: string; dueDate: string; notes: string; documentIds: string[];
};
type ComplianceInitial = {
  title: string; clientId: string; category: string; description: string; dueDate: string;
  assignedToId: string; status: string; completedAt: string; notes: string; documentIds: string[];
};

function Errors({ state }: { state: TaxActionState }) {
  return (
    <>
      {state.error && <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">{state.error}</p>}
      {state.fieldErrors && Object.entries(state.fieldErrors).map(([field, message]) => (
        <p className="mt-1 text-sm text-error" key={field}>{message}</p>
      ))}
    </>
  );
}

function DocumentSelect({
  documents,
  initial = [],
}: {
  documents: DocumentOption[];
  initial?: string[];
}) {
  return (
    <div className="sm:col-span-2">
      <label className="form-label" htmlFor="tax-document-ids">Related documents <span className="font-normal text-text-secondary">(optional; select client or company documents)</span></label>
      <select className="form-control min-h-32" defaultValue={initial} id="tax-document-ids" multiple name="documentIds">
        {documents.map((document) => (
          <option key={document.id} value={document.id}>
            {document.title} — {document.originalName}{document.clientId ? "" : " (Company)"}
          </option>
        ))}
      </select>
      {documents.length === 0 && <p className="mt-1 text-xs text-text-secondary">No existing documents are available.</p>}
    </div>
  );
}

export function TaxRecordForm({
  action,
  clients,
  documents,
  initial,
}: {
  action: BoundAction;
  clients: ClientOption[];
  documents: DocumentOption[];
  initial?: TaxRecordInitial;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5">
      <Errors state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="form-label" htmlFor="tax-client">Client</label>
          <select className="form-control" defaultValue={initial?.clientId ?? ""} id="tax-client" name="clientId" required>
            <option value="">Select a client</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.displayName}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="tax-period">Tax period / fiscal year</label>
          <input className="form-control" defaultValue={initial?.taxPeriod ?? ""} id="tax-period" maxLength={100} name="taxPeriod" placeholder="Enter applicable period" required />
        </div>
        <div>
          <label className="form-label" htmlFor="tax-type">Tax type</label>
          <input className="form-control" defaultValue={initial?.taxType ?? ""} id="tax-type" maxLength={100} name="taxType" placeholder="Enter applicable tax type" required />
        </div>
        <div>
          <label className="form-label" htmlFor="tax-filing-status">Filing status</label>
          <select className="form-control" defaultValue={initial?.filingStatus ?? "NOT_FILED"} id="tax-filing-status" name="filingStatus" required>
            <option value="NOT_FILED">Not filed</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="FILED">Filed</option>
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="tax-filing-date">Filing date <span className="font-normal text-text-secondary">(optional)</span></label>
          <input className="form-control" defaultValue={initial?.filingDate ?? ""} id="tax-filing-date" name="filingDate" type="date" />
        </div>
        <div>
          <label className="form-label" htmlFor="tax-due-date">Due date <span className="font-normal text-text-secondary">(optional)</span></label>
          <input className="form-control" defaultValue={initial?.dueDate ?? ""} id="tax-due-date" name="dueDate" type="date" />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label" htmlFor="tax-notes">Notes <span className="font-normal text-text-secondary">(optional)</span></label>
          <textarea className="form-control min-h-24" defaultValue={initial?.notes ?? ""} id="tax-notes" maxLength={5000} name="notes" />
        </div>
        <DocumentSelect documents={documents} initial={initial?.documentIds} />
      </div>
      <div className="flex justify-end border-t border-border pt-4">
        <button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save tax record"}</button>
      </div>
    </form>
  );
}

export function ComplianceTaskForm({
  action,
  clients,
  documents,
  staff,
  initial,
}: {
  action: BoundAction;
  clients: Array<Pick<ClientOption, "id" | "displayName">>;
  documents: DocumentOption[];
  staff: StaffOption[];
  initial?: ComplianceInitial;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5">
      <Errors state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="form-label" htmlFor="compliance-title">Task title</label>
          <input className="form-control" defaultValue={initial?.title ?? ""} id="compliance-title" maxLength={200} name="title" required />
        </div>
        <div>
          <label className="form-label" htmlFor="compliance-client">Client <span className="font-normal text-text-secondary">(optional)</span></label>
          <select className="form-control" defaultValue={initial?.clientId ?? ""} id="compliance-client" name="clientId">
            <option value="">Company / no client</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.displayName}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="compliance-category">Compliance category</label>
          <input className="form-control" defaultValue={initial?.category ?? ""} id="compliance-category" maxLength={100} name="category" placeholder="Enter a category" required />
        </div>
        <div>
          <label className="form-label" htmlFor="compliance-due-date">Due date</label>
          <input className="form-control" defaultValue={initial?.dueDate ?? ""} id="compliance-due-date" name="dueDate" required type="date" />
        </div>
        <div>
          <label className="form-label" htmlFor="compliance-assignee">Assign to staff <span className="font-normal text-text-secondary">(required for staff task)</span></label>
          <select className="form-control" defaultValue={initial?.assignedToId ?? ""} id="compliance-assignee" name="assignedToId">
            <option value="">Select a staff member</option>
            {staff.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="compliance-status">Status</label>
          <select className="form-control" defaultValue={initial?.status ?? "PENDING"} id="compliance-status" name="status" required>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <p className="mt-1 text-xs text-text-secondary">Overdue is determined from the due date until the task is completed.</p>
        </div>
        <div>
          <label className="form-label" htmlFor="compliance-completed-date">Completion date <span className="font-normal text-text-secondary">(optional)</span></label>
          <input className="form-control" defaultValue={initial?.completedAt ?? ""} id="compliance-completed-date" name="completedAt" type="date" />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label" htmlFor="compliance-description">Description <span className="font-normal text-text-secondary">(optional)</span></label>
          <textarea className="form-control min-h-20" defaultValue={initial?.description ?? ""} id="compliance-description" maxLength={1000} name="description" />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label" htmlFor="compliance-notes">Assignment note <span className="font-normal text-text-secondary">(optional, visible to the assigned staff)</span></label>
          <textarea className="form-control min-h-24" defaultValue={initial?.notes ?? ""} id="compliance-notes" maxLength={5000} name="notes" placeholder="Add instructions or context for the assigned staff member" />
        </div>
        <DocumentSelect documents={documents} initial={initial?.documentIds} />
      </div>
      <div className="flex justify-end border-t border-border pt-4">
        <button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save compliance task"}</button>
      </div>
    </form>
  );
}

export function CompleteComplianceTaskForm({ action }: { action: BoundAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3">
      {state.error && <p className="text-sm text-error" role="alert">{state.error}</p>}
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Completing…" : "Mark as completed"}
      </button>
    </form>
  );
}
