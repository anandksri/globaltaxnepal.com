"use client";

import { useActionState } from "react";
import { useState } from "react";
import { CreditCard, Printer, XCircle } from "lucide-react";
import type { BillingActionState } from "./actions";

type BoundBillAction = (
  previousState: BillingActionState,
  formData: FormData,
) => Promise<BillingActionState>;

export function PaymentForm({
  action,
  today,
}: {
  action: BoundBillAction;
  today: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  return (
    <section className="border-t border-border pt-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
        <CreditCard aria-hidden="true" className="size-5" strokeWidth={1.75} />
        Record payment
      </h2>
      <p className="mt-1 text-sm text-text-secondary">Record a payment against the outstanding bill balance.</p>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.error && <p className="sm:col-span-2 lg:col-span-3" role="alert">{state.error}</p>}
        <div>
          <label className="form-label" htmlFor="paymentDate">Payment date</label>
          <input className="form-control" defaultValue={today} id="paymentDate" name="paymentDate" required type="date" />
        </div>
        <div>
          <label className="form-label" htmlFor="paymentMethod">Payment method</label>
          <select className="form-control" id="paymentMethod" name="method" required defaultValue="CASH">
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="DIGITAL_WALLET">Digital wallet</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="paymentAmount">Amount received</label>
          <input className="form-control" id="paymentAmount" min="0.01" name="amount" required step="0.01" type="number" />
        </div>
        <div>
          <label className="form-label" htmlFor="paymentReference">Reference <span className="font-normal text-text-secondary">(optional)</span></label>
          <input className="form-control" id="paymentReference" maxLength={100} name="reference" />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label" htmlFor="paymentNotes">Notes <span className="font-normal text-text-secondary">(optional)</span></label>
          <input className="form-control" id="paymentNotes" maxLength={1000} name="notes" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <button className="button button-primary" disabled={isPending} type="submit">
            {isPending ? "Recording…" : "Record payment"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function PrintInvoiceButton() {
  return (
    <button className="button button-secondary" onClick={() => window.print()} type="button">
      <Printer aria-hidden="true" className="size-4" strokeWidth={1.75} />
      Print
    </button>
  );
}

export function CancelBillForm({
  action,
}: {
  action: BoundBillAction;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [reason, setReason] = useState("");
  return (
    <section className="border-t border-border pt-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-primary">
        <XCircle aria-hidden="true" className="size-5" strokeWidth={1.75} />
        Cancel bill
      </h2>
      <form
        action={formAction}
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          if (!window.confirm("Cancel this bill? This action is recorded and cannot be undone.")) {
            event.preventDefault();
          }
        }}
      >
        <div className="min-w-60 flex-1">
          <label className="form-label" htmlFor="cancellationReason">Reason for cancellation</label>
          <input className="form-control" id="cancellationReason" maxLength={500} minLength={5} name="reason" onChange={(event) => setReason(event.target.value)} required value={reason} />
        </div>
        <button className="button border border-error bg-surface text-error hover:bg-error/5" disabled={isPending} type="submit">
          {isPending ? "Cancelling…" : "Cancel bill"}
        </button>
        {state.error && <p className="w-full text-sm text-error" role="alert">{state.error}</p>}
      </form>
    </section>
  );
}
