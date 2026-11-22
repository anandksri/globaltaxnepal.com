"use client";

import { useActionState, useRef, useState } from "react";
import { Printer, RotateCcw, Save } from "lucide-react";
import type { BillingActionState } from "@/app/admin/(protected)/billing/actions";

type BoundAction = (state: BillingActionState, formData: FormData) => Promise<BillingActionState>;

type ClientOption = {
  id: string;
  displayName: string;
  contactPerson?: string | null;
  phone?: string | null;
  panNumber?: string | null;
  province?: string | null;
  district?: string | null;
  municipality?: string | null;
  wardNumber?: number | null;
  streetAddress?: string | null;
  address?: string | null;
};

type BillOption = {
  id: string;
  billNumber: string;
  clientId: string;
  totalAmount: string;
};

type VoucherInitial = {
  voucherDate: string;
  amount: string;
  method: string;
  reference: string;
  voucherNumber?: string;
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
  bills = [],
  initial,
}: {
  action: BoundAction;
  kind: "receipt" | "payment";
  currencyCode: string;
  clients?: ClientOption[];
  bills?: BillOption[];
  initial?: VoucherInitial;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [amountReceived, setAmountReceived] = useState(initial?.amount ?? "0.00");
  const [linkedBillId, setLinkedBillId] = useState("");
  const [useCustomNumber, setUseCustomNumber] = useState(Boolean(initial?.voucherNumber));
  const [customVoucherNumber, setCustomVoucherNumber] = useState(initial?.voucherNumber ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  const selectedClient = clients.find((client) => client.id === clientId);
  const clientAddress = selectedClient
    ? [
        selectedClient.streetAddress || selectedClient.address,
        selectedClient.wardNumber ? `Ward ${selectedClient.wardNumber}` : null,
        selectedClient.municipality,
        selectedClient.district,
        selectedClient.province,
      ].filter(Boolean).join(", ")
    : "";

  const availableBills = bills.filter((bill) => !clientId || bill.clientId === clientId);
  const linkedBill = availableBills.find((bill) => bill.id === linkedBillId);
  const dueAmount = linkedBill
    ? Math.max(Number(linkedBill.totalAmount) - Number(amountReceived || "0"), 0)
    : 0;

  function clearForm() {
    formRef.current?.reset();
    setClientId("");
    setAmountReceived("0.00");
    setLinkedBillId("");
    setUseCustomNumber(false);
    setCustomVoucherNumber("");
  }

  if (kind === "receipt") {
    return (
      <form action={formAction} className="space-y-7" ref={formRef}>
        {state.error && (
          <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
            {state.error}
          </p>
        )}

        <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="receipt-document-details">
          <h2 className="text-lg font-semibold text-primary" id="receipt-document-details">
            <span className="mr-3 text-text-secondary">01</span>Document details
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="voucherDate">Date (B.S.) <span className="text-error">*</span></label>
              <input
                className="form-control"
                defaultValue={initial?.voucherDate ?? new Date().toISOString().slice(0, 10)}
                id="voucherDate"
                max="9999-12-31"
                name="voucherDate"
                required
                type="date"
              />
              <p className="form-hint">Enter the date in Nepali calendar format (YYYY/MM/DD).</p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="form-label mb-0" htmlFor="customVoucherNumber">Bill number</label>
                {initial?.voucherNumber && (
                  <span className="text-xs text-text-secondary">{initial.voucherNumber}</span>
                )}
              </div>
              {useCustomNumber ? (
                <input
                  className="form-control"
                  id="customVoucherNumber"
                  maxLength={40}
                  name="customVoucherNumber"
                  onChange={(event) => setCustomVoucherNumber(event.target.value)}
                  required
                  value={customVoucherNumber}
                />
              ) : (
                <>
                  <input
                    className="form-control bg-background text-text-secondary"
                    readOnly
                    value={initial?.voucherNumber ?? "83080601"}
                  />
                  <input name="customVoucherNumber" type="hidden" value="" />
                </>
              )}
              <label className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                <input
                  checked={useCustomNumber}
                  onChange={(event) => setUseCustomNumber(event.target.checked)}
                  type="checkbox"
                />
                Use a custom bill number
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="receipt-customer-details">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-primary" id="receipt-customer-details">
              <span className="mr-3 text-text-secondary">01</span>Customer details
            </h2>
            <select aria-label="Customer type" className="form-control w-auto min-w-44" defaultValue="existing">
              <option value="existing">Existing customer</option>
            </select>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="voucherClient">Name</label>
              <select
                className="form-control"
                id="voucherClient"
                name="clientId"
                onChange={(event) => {
                  setClientId(event.target.value);
                  setLinkedBillId("");
                }}
                required
                value={clientId}
              >
                <option value="">Customer name</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.displayName}</option>
                ))}
              </select>
              {state.fieldErrors?.clientId && <p className="form-hint form-hint-error">{state.fieldErrors.clientId}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="receiptCustomerAddress">Address</label>
              <input className="form-control" id="receiptCustomerAddress" placeholder="Street, city" readOnly value={clientAddress} />
            </div>
            <div>
              <label className="form-label" htmlFor="receiptCustomerCompany">Company name</label>
              <input className="form-control" id="receiptCustomerCompany" placeholder="Company (optional)" readOnly value={selectedClient?.displayName ?? ""} />
            </div>
            <div>
              <label className="form-label" htmlFor="receiptCustomerPhone">Contact number</label>
              <input className="form-control" id="receiptCustomerPhone" placeholder="98XXXXXXXX" readOnly value={selectedClient?.phone ?? ""} />
            </div>
            <div>
              <label className="form-label" htmlFor="receiptCustomerPan">PAN number</label>
              <input className="form-control" id="receiptCustomerPan" placeholder="PAN (optional)" readOnly value={selectedClient?.panNumber ?? ""} />
            </div>
            <div>
              <label className="form-label" htmlFor="receiptCustomerUserId">User ID</label>
              <input className="form-control" id="receiptCustomerUserId" placeholder="User ID (optional)" readOnly value={clientId} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="receipt-payment-details">
          <h2 className="text-lg font-semibold text-primary" id="receipt-payment-details">
            <span className="mr-3 text-text-secondary">02</span>Payment details
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="voucherAmount">Amount received <span className="text-error">*</span></label>
              <input
                className="form-control"
                id="voucherAmount"
                min="0.01"
                name="amount"
                onChange={(event) => setAmountReceived(event.target.value)}
                required
                step="0.01"
                type="number"
                value={amountReceived}
              />
              {state.fieldErrors?.amount && <p className="form-hint form-hint-error">{state.fieldErrors.amount}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="dueAmount">Due amount</label>
              <input
                className="form-control"
                id="dueAmount"
                readOnly
                value={linkedBill ? dueAmount.toFixed(2) : "0.00"}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="linkedBill">Link to a normal bill <span className="font-normal text-text-secondary">(optional)</span></label>
              <select
                className="form-control"
                id="linkedBill"
                name="linkedBillId"
                onChange={(event) => setLinkedBillId(event.target.value)}
                value={linkedBillId}
              >
                <option value="">No linked bill</option>
                {availableBills.map((bill) => (
                  <option key={bill.id} value={bill.id}>{bill.billNumber}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="voucherMethod">Payment method</label>
              <PaymentMethodSelect initial={initial?.method} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="voucherReference">Reference number <span className="font-normal text-text-secondary">(optional)</span></label>
              <input className="form-control" defaultValue={initial?.reference} id="voucherReference" maxLength={100} name="reference" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="voucherDescription">Notes or payment remarks <span className="font-normal text-text-secondary">(optional)</span></label>
              <textarea
                className="form-control min-h-24"
                defaultValue={initial?.description}
                id="voucherDescription"
                maxLength={1000}
                name="description"
                placeholder="Add a note for this document"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button className="button button-primary" disabled={pending} type="submit">
            <Save aria-hidden="true" className="size-4" />
            {pending ? "Saving…" : "Save receipt"}
          </button>
          <button className="button button-secondary" onClick={() => window.print()} type="button">
            <Printer aria-hidden="true" className="size-4" />
            Print
          </button>
          <button className="ml-auto flex min-h-11 items-center gap-2 px-2 text-sm text-text-secondary hover:text-primary" onClick={clearForm} type="button">
            <RotateCcw aria-hidden="true" className="size-4" />
            Clear form
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-5" ref={formRef}>
      {state.error && <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">{state.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="voucherDate">Voucher date</label>
          <input className="form-control" defaultValue={initial?.voucherDate ?? new Date().toISOString().slice(0, 10)} id="voucherDate" name="voucherDate" required type="date" />
        </div>
        <div>
          <label className="form-label" htmlFor="voucherAmount">Amount ({currencyCode})</label>
          <input className="form-control" defaultValue={initial?.amount} id="voucherAmount" min="0.01" name="amount" required step="0.01" type="number" />
        </div>
        <div>
          <label className="form-label" htmlFor="payeeName">Payee name</label>
          <input className="form-control" defaultValue={initial?.payeeName} id="payeeName" maxLength={200} name="payeeName" required />
        </div>
        <div>
          <label className="form-label" htmlFor="voucherMethod">Payment method</label>
          <PaymentMethodSelect initial={initial?.method} />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label" htmlFor="voucherPurpose">Payment purpose</label>
          <textarea className="form-control min-h-24" defaultValue={initial?.purpose} id="voucherPurpose" maxLength={1000} name="purpose" required />
        </div>
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
