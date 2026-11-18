"use client";

import { useActionState, useState } from "react";
import { Printer } from "lucide-react";
import type { BillingActionState } from "@/app/admin/(protected)/billing/actions";

type BoundAction = (state: BillingActionState, formData: FormData) => Promise<BillingActionState>;

export function PrintDetailsBillButton() {
  return (
    <button className="button button-secondary" onClick={() => window.print()} type="button">
      <Printer aria-hidden="true" className="size-4" strokeWidth={1.75} />
      Print
    </button>
  );
}

export function MarkDetailsBillPaidForm({ action }: { action: BoundAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <div>
        <label className="form-label" htmlFor="details-payment-date">Payment date</label>
        <input className="form-control" defaultValue={new Date().toISOString().slice(0, 10)} id="details-payment-date" name="paymentDate" required type="date" />
      </div>
      <div>
        <label className="form-label" htmlFor="details-payment-method">Method</label>
        <select className="form-control" defaultValue="CASH" id="details-payment-method" name="method">
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="DIGITAL_WALLET">Digital wallet</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <label className="form-label" htmlFor="details-payment-reference">Reference (optional)</label>
        <input className="form-control" id="details-payment-reference" maxLength={100} name="reference" />
      </div>
      <button className="button button-primary" disabled={pending} type="submit">{pending ? "Recording…" : "Record full payment"}</button>
      {state.error && <p className="text-sm text-error sm:col-span-4" role="alert">{state.error}</p>}
    </form>
  );
}

export function CancelDetailsBillForm({ action }: { action: BoundAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [reason, setReason] = useState("");
  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
      onSubmit={(event) => {
        if (!window.confirm("Cancel this details bill? This action is recorded and cannot be undone.")) event.preventDefault();
      }}
    >
      <div className="min-w-60 flex-1">
        <label className="form-label" htmlFor="details-cancel-reason">Cancellation reason</label>
        <input className="form-control" id="details-cancel-reason" maxLength={500} minLength={5} name="reason" onChange={(event) => setReason(event.target.value)} required value={reason} />
      </div>
      <button className="button border border-error bg-surface text-error hover:bg-error/5" disabled={pending} type="submit">{pending ? "Cancelling…" : "Cancel bill"}</button>
      {state.error && <p className="w-full text-sm text-error" role="alert">{state.error}</p>}
    </form>
  );
}
