"use client";

import { useActionState } from "react";
import type { BillingActionState } from "@/app/admin/(protected)/billing/actions";

type BoundAction = (state: BillingActionState, formData: FormData) => Promise<BillingActionState>;

type ClientOption = {
  id: string;
  displayName: string;
};

type VoucherInitial = {
  voucherDate: string;
  amount: string;
  method: string;
  reference: string;
  clientId?: string;
  description?: string;
  payeeName?: string;
  purpose?: string;
};

export function VoucherForm({
  action,
  kind,
  currencyCode,
  clients = [],
  initial,
}: {
  action: BoundAction;
  kind: "receipt" | "payment";
  currencyCode: string;
  clients?: ClientOption[];
  initial?: VoucherInitial;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5">
      {state.error && <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">{state.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="voucherDate">Voucher date</label>
          <input className="form-control" defaultValue={initial?.voucherDate ?? new Date().toISOString().slice(0, 10)} id="voucherDate" name="voucherDate" required type="date" />
          {state.fieldErrors?.voucherDate && <p className="form-hint form-hint-error">{state.fieldErrors.voucherDate}</p>}
        </div>
        <div>
          <label className="form-label" htmlFor="voucherAmount">Amount ({currencyCode})</label>
          <input className="form-control" defaultValue={initial?.amount} id="voucherAmount" min="0.01" name="amount" required step="0.01" type="number" />
          {state.fieldErrors?.amount && <p className="form-hint form-hint-error">{state.fieldErrors.amount}</p>}
        </div>
        {kind === "receipt" ? (
          <>
            <div>
              <label className="form-label" htmlFor="voucherClient">Client</label>
              <select className="form-control" defaultValue={initial?.clientId ?? ""} id="voucherClient" name="clientId" required>
                <option value="">Select a client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.displayName}</option>)}
              </select>
              {state.fieldErrors?.clientId && <p className="form-hint form-hint-error">{state.fieldErrors.clientId}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="voucherMethod">Payment method</label>
              <PaymentMethodSelect initial={initial?.method} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="voucherDescription">Description</label>
              <textarea className="form-control min-h-24" defaultValue={initial?.description} id="voucherDescription" maxLength={1000} name="description" required />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="form-label" htmlFor="payeeName">Payee name</label>
              <input className="form-control" defaultValue={initial?.payeeName} id="payeeName" maxLength={200} name="payeeName" required />
              {state.fieldErrors?.payeeName && <p className="form-hint form-hint-error">{state.fieldErrors.payeeName}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="voucherMethod">Payment method</label>
              <PaymentMethodSelect initial={initial?.method} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="voucherPurpose">Payment purpose</label>
              <textarea className="form-control min-h-24" defaultValue={initial?.purpose} id="voucherPurpose" maxLength={1000} name="purpose" required />
              {state.fieldErrors?.purpose && <p className="form-hint form-hint-error">{state.fieldErrors.purpose}</p>}
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className="form-label" htmlFor="voucherReference">Reference number <span className="font-normal text-text-secondary">(optional)</span></label>
          <input className="form-control" defaultValue={initial?.reference} id="voucherReference" maxLength={100} name="reference" />
        </div>
      </div>
      <div className="flex justify-end border-t border-border pt-4">
        <button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save voucher"}</button>
      </div>
    </form>
  );
}

function PaymentMethodSelect({ initial }: { initial?: string }) {
  return (
    <select className="form-control" defaultValue={initial ?? "CASH"} id="voucherMethod" name="method" required>
      <option value="CASH">Cash</option>
      <option value="BANK_TRANSFER">Bank transfer</option>
      <option value="CHEQUE">Cheque</option>
      <option value="DIGITAL_WALLET">Digital wallet</option>
      <option value="OTHER">Other</option>
    </select>
  );
}
