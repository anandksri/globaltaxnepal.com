"use client";

import { useActionState, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Download, Printer, RotateCcw, Save } from "lucide-react";
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
  const [paymentAmount, setPaymentAmount] = useState(initial?.amount ?? "0.00");
  const [payeeName, setPayeeName] = useState(initial?.payeeName ?? "");
  const [paymentPurpose, setPaymentPurpose] = useState(initial?.purpose ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initial?.method ?? "CASH");
  const [voucherDate, setVoucherDate] = useState(initial?.voucherDate ?? new Date().toISOString().slice(0, 10));
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
    setPaymentAmount("0.00");
    setPayeeName("");
    setPaymentPurpose("");
    setPaymentMethod("CASH");
    setVoucherDate(new Date().toISOString().slice(0, 10));
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
    <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <form action={formAction} className="space-y-7" ref={formRef}>
        {state.error && (
          <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
            {state.error}
          </p>
        )}

        <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="payment-document-details">
          <h2 className="text-lg font-semibold text-primary" id="payment-document-details">
            <span className="mr-3 text-text-secondary">01</span>Document details
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="voucherDate">Date (B.S.) <span className="text-error">*</span></label>
              <input
                className="form-control"
                id="voucherDate"
                max="9999-12-31"
                name="voucherDate"
                onChange={(event) => setVoucherDate(event.target.value)}
                required
                type="date"
                value={voucherDate}
              />
              <p className="form-hint">Enter the date in Nepali calendar format (YYYY/MM/DD).</p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="form-label mb-0" htmlFor="customVoucherNumber">Bill number</label>
                {initial?.voucherNumber && <span className="text-xs text-text-secondary">{initial.voucherNumber}</span>}
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
                  <input className="form-control bg-background text-text-secondary" readOnly value={initial?.voucherNumber ?? "83080601"} />
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

        <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="payment-customer-details">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-primary" id="payment-customer-details">
              <span className="mr-3 text-text-secondary">01</span>Customer details
            </h2>
            <select aria-label="Customer type" className="form-control w-auto min-w-44" defaultValue="existing">
              <option value="existing">Existing customer</option>
            </select>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="payeeName">Name</label>
              <input
                className="form-control"
                id="payeeName"
                maxLength={200}
                name="payeeName"
                onChange={(event) => setPayeeName(event.target.value)}
                placeholder="Customer name"
                required
                value={payeeName}
              />
              {state.fieldErrors?.payeeName && <p className="form-hint form-hint-error">{state.fieldErrors.payeeName}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="paymentCustomerAddress">Address</label>
              <input className="form-control" id="paymentCustomerAddress" placeholder="Street, city" readOnly />
            </div>
            <div>
              <label className="form-label" htmlFor="paymentCustomerCompany">Company name</label>
              <input className="form-control" id="paymentCustomerCompany" placeholder="Company (optional)" readOnly />
            </div>
            <div>
              <label className="form-label" htmlFor="paymentCustomerPhone">Contact number</label>
              <input className="form-control" id="paymentCustomerPhone" placeholder="98XXXXXXXX" readOnly />
            </div>
            <div>
              <label className="form-label" htmlFor="paymentCustomerPan">PAN number</label>
              <input className="form-control" id="paymentCustomerPan" placeholder="PAN (optional)" readOnly />
            </div>
            <div>
              <label className="form-label" htmlFor="paymentCustomerUserId">User ID</label>
              <input className="form-control" id="paymentCustomerUserId" placeholder="User ID (optional)" readOnly />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="payment-details">
          <h2 className="text-lg font-semibold text-primary" id="payment-details">
            <span className="mr-3 text-text-secondary">02</span>Payment details
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="voucherAmount">Amount paid <span className="text-error">*</span></label>
              <input
                className="form-control"
                id="voucherAmount"
                min="0.01"
                name="amount"
                onChange={(event) => setPaymentAmount(event.target.value)}
                required
                step="0.01"
                type="number"
                value={paymentAmount}
              />
              {state.fieldErrors?.amount && <p className="form-hint form-hint-error">{state.fieldErrors.amount}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="dueAmount">Due amount</label>
              <input className="form-control" id="dueAmount" readOnly value="0.00" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="linkedNormalBill">Link to a normal bill <span className="font-normal text-text-secondary">(optional)</span></label>
              <select className="form-control" id="linkedNormalBill" name="linkedBillId" defaultValue="">
                <option value="">No linked bill</option>
                {bills.map((bill) => (
                  <option key={bill.id} value={bill.id}>{bill.billNumber}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="voucherMethod">Payment method</label>
              <PaymentMethodSelect
                initial={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="voucherReference">Reference number <span className="font-normal text-text-secondary">(optional)</span></label>
              <input className="form-control" defaultValue={initial?.reference} id="voucherReference" maxLength={100} name="reference" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="voucherPurpose">Notes or payment remarks <span className="font-normal text-text-secondary">(optional)</span></label>
              <textarea
                className="form-control min-h-24"
                id="voucherPurpose"
                maxLength={1000}
                name="purpose"
                onChange={(event) => setPaymentPurpose(event.target.value)}
                placeholder="Add a note for this document"
                value={paymentPurpose}
              />
              {state.fieldErrors?.purpose && <p className="form-hint form-hint-error">{state.fieldErrors.purpose}</p>}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button className="button button-primary" disabled={pending} type="submit">
            <Save aria-hidden="true" className="size-4" />
            {pending ? "Saving…" : "Save payment"}
          </button>
          <button className="button button-secondary" onClick={() => window.print()} type="button">
            <Printer aria-hidden="true" className="size-4" />
            Print
          </button>
          {initial?.voucherNumber && (
            <button className="button button-secondary" disabled type="button">
              <Download aria-hidden="true" className="size-4" />
              Download PDF
            </button>
          )}
          <button className="ml-auto flex min-h-11 items-center gap-2 px-2 text-sm text-text-secondary hover:text-primary" onClick={clearForm} type="button">
            <RotateCcw aria-hidden="true" className="size-4" />
            Clear form
          </button>
        </div>
      </form>

      <aside className="sticky top-24">
        <p className="mb-3 text-xs font-medium text-secondary">• Live preview</p>
        <div className="border border-border bg-surface p-5 text-xs text-text-secondary">
          <div className="flex items-start justify-between border-b border-border pb-4">
            <div>
              <p className="font-semibold text-primary">GTN</p>
              <p>Global Tax Nepal</p>
              <p>Tax &amp; business services</p>
            </div>
            <div className="text-right">
              <p className="text-[0.65rem]">Payment Voucher</p>
            </div>
          </div>
          <div className="mt-4 flex justify-between gap-3">
            <span>BILL NO. 3</span>
            <span className="text-right">Document no.<br />{customVoucherNumber || initial?.voucherNumber || "83080601"}</span>
          </div>
          <p className="mt-1 text-right">Date (B.S.)<br />{voucherDate || "-"}</p>
          <div className="mt-5 border-b border-border pb-3">
            <p>Billed to</p>
            <p className="mt-1 font-semibold text-primary">{payeeName || "Customer name"}</p>
          </div>
          <div className="mt-5 border border-dashed border-border bg-background px-4 py-10 text-center">
            <p className="text-[0.65rem]">Payment paid</p>
            <p className="mt-1 text-lg font-semibold text-primary">{currencyCode} {Number(paymentAmount || "0").toFixed(2)}</p>
          </div>
          <div className="mt-12 flex justify-between gap-6 border-t border-border pt-3">
            <span>Received by</span>
            <span>Authorized signature</span>
          </div>
          <p className="mt-8 text-center">Thank you for your business.</p>
        </div>
      </aside>
    </div>
  );
}

function PaymentMethodSelect({
  initial,
  onChange,
}: {
  initial?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <select
      className="form-control"
      defaultValue={initial ?? "CASH"}
      id="voucherMethod"
      name="method"
      onChange={onChange}
      required
    >
      <option value="CASH">Cash</option>
      <option value="BANK_TRANSFER">Bank transfer</option>
      <option value="CHEQUE">Cheque</option>
      <option value="DIGITAL_WALLET">Digital wallet</option>
      <option value="OTHER">Other</option>
    </select>
  );
}
