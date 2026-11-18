"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { BillingActionState } from "@/app/admin/(protected)/billing/actions";

type BoundAction = (
  state: BillingActionState,
  formData: FormData,
) => Promise<BillingActionState>;

type CategoryOption = { id: string; name: string };
type ClientOption = { id: string; displayName: string };
type SourceOption = {
  id: string;
  label: string;
  date: string;
  amount: string;
  method: string;
  description: string;
  reference: string;
  clientId?: string;
  paidTo?: string;
};
type FormValues = {
  date: string;
  categoryId: string;
  description: string;
  amount: string;
  method: string;
  clientId?: string;
  paidTo?: string;
  reference: string;
  sourcePaymentId?: string;
  sourceReceiptVoucherId?: string;
  sourcePaymentVoucherId?: string;
  currencyCode?: string;
};

const paymentMethods = [
  ["CASH", "Cash"],
  ["BANK_TRANSFER", "Bank transfer"],
  ["CHEQUE", "Cheque"],
  ["DIGITAL_WALLET", "Digital wallet"],
  ["OTHER", "Other"],
];

export function AccountForm({
  action,
  kind,
  currencyCode,
  categories,
  clients = [],
  paymentSources = [],
  receiptSources = [],
  initial,
}: {
  action: BoundAction;
  kind: "income" | "expense";
  currencyCode?: string;
  categories: CategoryOption[];
  clients?: ClientOption[];
  paymentSources?: SourceOption[];
  receiptSources?: SourceOption[];
  initial?: FormValues;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const accountCurrency = currencyCode ?? initial?.currencyCode ?? "NPR";
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [method, setMethod] = useState(initial?.method ?? "CASH");
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [paidTo, setPaidTo] = useState(initial?.paidTo ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");

  function applySource(source?: SourceOption) {
    if (!source) return;
    setDate(source.date);
    setAmount(source.amount);
    setMethod(source.method);
    setDescription(source.description);
    setReference(source.reference);
    if (kind === "income") setClientId(source.clientId ?? "");
    else setPaidTo(source.paidTo ?? "");
  }

  const fieldError = (key: string) => state.fieldErrors?.[key]
    ? <p className="form-hint form-hint-error">{state.fieldErrors[key]}</p>
    : null;

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">{state.error}</p>}
      {kind === "income" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="form-label">Link existing receipt (optional)</p>
            <p className="mb-2 text-xs text-text-secondary">Link a bill payment, receipt voucher, or both for the same transaction. Linked sources are counted once.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <select aria-label="Link bill payment" className="form-control" defaultValue={initial?.sourcePaymentId ?? ""} name="sourcePaymentId" onChange={(event) => applySource(paymentSources.find((source) => source.id === event.target.value))}>
                <option value="">No bill payment linked</option>
                {paymentSources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
              </select>
              <select aria-label="Link receipt voucher" className="form-control" defaultValue={initial?.sourceReceiptVoucherId ?? ""} name="sourceReceiptVoucherId" onChange={(event) => applySource(receiptSources.find((source) => source.id === event.target.value))}>
                <option value="">No receipt voucher linked</option>
                {receiptSources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="account-date">Income date</label>
            <input className="form-control" id="account-date" name="date" onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
            {fieldError("date")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-category">Category</label>
            <select className="form-control" defaultValue={initial?.categoryId ?? ""} id="account-category" name="categoryId" required>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {fieldError("categoryId")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-amount">Amount received ({accountCurrency})</label>
            <input className="form-control" id="account-amount" min="0.01" name="amount" onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} />
            {fieldError("amount")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-method">Payment method</label>
            <select className="form-control" id="account-method" name="method" onChange={(event) => setMethod(event.target.value)} required value={method}>
              {paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {fieldError("method")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-client">Client <span className="font-normal text-text-secondary">(optional)</span></label>
            <select className="form-control" id="account-client" name="clientId" onChange={(event) => setClientId(event.target.value)} value={clientId}>
              <option value="">No client selected</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.displayName}</option>)}
            </select>
            {fieldError("clientId")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-reference">Reference number <span className="font-normal text-text-secondary">(optional)</span></label>
            <input className="form-control" id="account-reference" maxLength={100} name="reference" onChange={(event) => setReference(event.target.value)} value={reference} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="account-description">Description</label>
            <textarea className="form-control min-h-24" id="account-description" maxLength={1000} name="description" onChange={(event) => setDescription(event.target.value)} required value={description} />
            {fieldError("description")}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="linked-payment-voucher">Link payment voucher <span className="font-normal text-text-secondary">(optional)</span></label>
            <select className="form-control" defaultValue={initial?.sourcePaymentVoucherId ?? ""} id="linked-payment-voucher" name="sourcePaymentVoucherId" onChange={(event) => applySource(paymentSources.find((source) => source.id === event.target.value))}>
              <option value="">No voucher linked</option>
              {paymentSources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-text-secondary">A linked voucher is represented once in expense totals.</p>
          </div>
          <div>
            <label className="form-label" htmlFor="account-date">Expense date</label>
            <input className="form-control" id="account-date" name="date" onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
            {fieldError("date")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-category">Category</label>
            <select className="form-control" defaultValue={initial?.categoryId ?? ""} id="account-category" name="categoryId" required>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {fieldError("categoryId")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-amount">Amount paid ({accountCurrency})</label>
            <input className="form-control" id="account-amount" min="0.01" name="amount" onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} />
            {fieldError("amount")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-method">Payment method</label>
            <select className="form-control" id="account-method" name="method" onChange={(event) => setMethod(event.target.value)} required value={method}>
              {paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {fieldError("method")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-paid-to">Paid to / vendor</label>
            <input className="form-control" id="account-paid-to" maxLength={200} name="paidTo" onChange={(event) => setPaidTo(event.target.value)} required value={paidTo} />
            {fieldError("paidTo")}
          </div>
          <div>
            <label className="form-label" htmlFor="account-reference">Reference number <span className="font-normal text-text-secondary">(optional)</span></label>
            <input className="form-control" id="account-reference" maxLength={100} name="reference" onChange={(event) => setReference(event.target.value)} value={reference} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="account-description">Description</label>
            <textarea className="form-control min-h-24" id="account-description" maxLength={1000} name="description" onChange={(event) => setDescription(event.target.value)} required value={description} />
            {fieldError("description")}
          </div>
        </div>
      )}
      <div className="flex justify-end border-t border-border pt-4">
        <button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : `Save ${kind}`}</button>
      </div>
    </form>
  );
}
