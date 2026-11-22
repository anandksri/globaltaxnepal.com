"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Plus, Printer, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  calculateBill,
  formatCurrency,
  type BillInput,
} from "@/lib/admin/billing";
import type { BillingActionState } from "./actions";

type ClientOption = {
  id: string;
  displayName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  panNumber: string | null;
  vatRegistered: boolean;
  vatNumber: string | null;
  province: string | null;
  district: string | null;
  municipality: string | null;
  wardNumber: number | null;
  streetAddress: string | null;
  address: string | null;
};

type BillItemValue = BillInput["items"][number];
type BillAction = (
  previousState: BillingActionState,
  formData: FormData,
) => Promise<BillingActionState>;

type BillFormProps = {
  action: BillAction;
  clients: ClientOption[];
  currencyCode: string;
  today: string;
  billNumber?: string;
  initial?: {
    clientId: string;
    billDate: string;
    dueDate: string;
    discount: string;
    vatApplied: boolean;
    vatRate: string;
    notes: string;
    items: BillItemValue[];
  };
};

const blankItem: BillItemValue = {
  description: "",
  quantity: "0",
  unit: "year",
  rate: "0.00",
};

export function BillForm({
  action,
  clients,
  currencyCode,
  today,
  billNumber,
  initial,
}: BillFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [items, setItems] = useState<BillItemValue[]>(
    initial?.items ?? [{ ...blankItem }, { ...blankItem }, { ...blankItem }],
  );
  const [discount] = useState(initial?.discount ?? "0.00");
  const [vatApplied] = useState(initial?.vatApplied ?? false);
  const [vatRate] = useState(initial?.vatRate ?? "0.00");
  const [useCustomNumber, setUseCustomNumber] = useState(Boolean(initial?.clientId && billNumber));
  const [customBillNumber, setCustomBillNumber] = useState(billNumber ?? "");
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

  const totals = useMemo(() => {
    if (
      !items.every((item) =>
        /^\d{1,9}(?:\.\d{1,3})?$/.test(item.quantity) &&
        /^\d{1,12}(?:\.\d{1,2})?$/.test(item.rate),
      )
    ) return null;
    try {
      return calculateBill({
        items,
        discount,
        vatApplied,
        vatRate,
      });
    } catch {
      return null;
    }
  }, [items, discount, vatApplied, vatRate]);

  function updateItem(index: number, field: keyof BillItemValue, value: string) {
    setItems((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ));
  }

  function clearForm() {
    formRef.current?.reset();
    setClientId("");
    setItems([{ ...blankItem }, { ...blankItem }, { ...blankItem }]);
    setUseCustomNumber(false);
    setCustomBillNumber("");
  }

  return (
    <form action={formAction} className="space-y-7" ref={formRef}>
      {state.error && (
        <p className="rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {state.error}
        </p>
      )}
      {Object.entries(state.fieldErrors ?? {}).map(([field, message]) => (
        <p className="text-sm text-error" key={field}>
          {field}: {message}
        </p>
      ))}

      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="document-details-title">
        <h2 className="text-lg font-semibold text-primary" id="document-details-title">
          <span className="mr-3 text-text-secondary">01</span>Document details
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="billDate">
              Date (B.S.) <span className="text-error">*</span>
            </label>
            <input
              className="form-control"
              defaultValue={initial?.billDate ?? today}
              id="billDate"
              max="9999-12-31"
              name="billDate"
              required
              type="date"
            />
            <p className="form-hint">Enter the date in Nepali calendar format (YYYY/MM/DD).</p>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="form-label mb-0" htmlFor="customBillNumber">Bill number</label>
              {billNumber && <span className="text-xs text-text-secondary">{billNumber}</span>}
            </div>
            {useCustomNumber ? (
              <input
                className="form-control"
                id="customBillNumber"
                maxLength={40}
                name="customBillNumber"
                onChange={(event) => setCustomBillNumber(event.target.value)}
                required
                value={customBillNumber}
              />
            ) : (
              <>
                <input
                  className="form-control bg-background text-text-secondary"
                  readOnly
                  value={billNumber ?? "Automatically assigned"}
                />
                <input name="customBillNumber" type="hidden" value="" />
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

      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="customer-details-title">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-primary" id="customer-details-title">
            <span className="mr-3 text-text-secondary">01</span>Customer details
          </h2>
          <select aria-label="Customer type" className="form-control w-auto min-w-44" defaultValue="existing">
            <option value="existing">Existing customer</option>
          </select>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="clientId">Name</label>
            <select
              className="form-control"
              id="clientId"
              name="clientId"
              onChange={(event) => setClientId(event.target.value)}
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
            <label className="form-label" htmlFor="customerAddress">Address</label>
            <input className="form-control" id="customerAddress" placeholder="Street, city" readOnly value={clientAddress} />
          </div>
          <div>
            <label className="form-label" htmlFor="customerCompany">Company name</label>
            <input className="form-control" id="customerCompany" placeholder="Company (optional)" readOnly value={selectedClient?.displayName ?? ""} />
          </div>
          <div>
            <label className="form-label" htmlFor="customerPhone">Contact number</label>
            <input className="form-control" id="customerPhone" placeholder="98XXXXXXXX" readOnly value={selectedClient?.phone ?? ""} />
          </div>
          <div>
            <label className="form-label" htmlFor="customerPan">PAN number</label>
            <input className="form-control" id="customerPan" placeholder="PAN (optional)" readOnly value={selectedClient?.panNumber ?? ""} />
          </div>
          <div>
            <label className="form-label" htmlFor="customerUserId">User ID</label>
            <input className="form-control" id="customerUserId" placeholder="User ID (optional)" readOnly value={clientId} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="bill-items-title">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-primary" id="bill-items-title">
            <span className="mr-3 text-text-secondary">02</span>Bill items
          </h2>
          <button
            className="flex min-h-10 items-center gap-1 px-2 text-sm font-medium text-secondary"
            onClick={() => setItems((current) => [...current, { ...blankItem }])}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add row
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[48rem] grid-cols-[3rem_minmax(16rem,1fr)_7rem_8rem_9rem_2.5rem] items-center gap-2 border-b border-border pb-2 text-xs font-medium text-text-secondary">
            <span>SN</span>
            <span>Particular</span>
            <span>Years</span>
            <span>Rate</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          {items.map((item, index) => {
            const amount = /^\d{1,9}(?:\.\d{1,3})?$/.test(item.quantity) &&
              /^\d{1,12}(?:\.\d{1,2})?$/.test(item.rate)
              ? calculateBill({ items: [item], discount: "0", vatApplied: false, vatRate: "0" }).itemAmounts[0].amount
              : null;
            return (
              <div className="grid min-w-[48rem] grid-cols-[3rem_minmax(16rem,1fr)_7rem_8rem_9rem_2.5rem] items-center gap-2 border-b border-border py-2" key={index}>
                <span className="px-1 text-sm text-text-secondary">{index + 1}</span>
                <input
                  aria-label={`Particular ${index + 1}`}
                  className="form-control"
                  maxLength={500}
                  name="itemDescription"
                  onChange={(event) => updateItem(index, "description", event.target.value)}
                  placeholder="Service or item"
                  required
                  value={item.description}
                />
                <input
                  aria-label={`Years ${index + 1}`}
                  className="form-control"
                  min="0"
                  name="itemQuantity"
                  onChange={(event) => updateItem(index, "quantity", event.target.value)}
                  required
                  step="0.001"
                  type="number"
                  value={item.quantity}
                />
                <input
                  aria-label={`Rate ${index + 1}`}
                  className="form-control"
                  min="0"
                  name="itemRate"
                  onChange={(event) => updateItem(index, "rate", event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={item.rate}
                />
                <p className="text-right text-sm font-medium text-text">
                  {amount === null ? `${currencyCode} 0.00` : formatCurrency(amount, currencyCode)}
                </p>
                <button
                  aria-label={`Remove bill item ${index + 1}`}
                  className="inline-flex size-9 items-center justify-center text-text-secondary hover:text-error"
                  onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
                <input name="itemUnit" type="hidden" value="year" />
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <div className="flex w-full max-w-xs items-center justify-between gap-4 text-base">
            <span className="text-text-secondary">Grand total</span>
            <strong className="text-primary">
              {totals ? formatCurrency(totals.totalAmount, currencyCode) : `${currencyCode} 0.00`}
            </strong>
          </div>
        </div>
      </section>

      <input name="discount" type="hidden" value="0.00" />
      <input name="vatApplied" type="hidden" value="" />
      <input name="vatRate" type="hidden" value="0.00" />
      <input name="dueDate" type="hidden" value="" />
      <input name="notes" type="hidden" value="" />

      <div className="flex flex-wrap items-center gap-3">
        <button className="button button-primary" disabled={isPending} name="intent" type="submit" value="issue">
          <Save aria-hidden="true" className="size-4" />
          {isPending ? "Saving…" : "Save bill"}
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
