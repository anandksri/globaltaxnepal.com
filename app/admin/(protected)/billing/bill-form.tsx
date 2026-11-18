"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  amountInWords,
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
  quantity: "1",
  unit: "service",
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
  const [items, setItems] = useState<BillItemValue[]>(initial?.items ?? [{ ...blankItem }]);
  const [discount, setDiscount] = useState(initial?.discount ?? "0.00");
  const [vatApplied, setVatApplied] = useState(initial?.vatApplied ?? false);
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? "0.00");
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
      ) ||
      !/^\d{1,12}(?:\.\d{1,2})?$/.test(discount) ||
      !/^\d{1,3}(?:\.\d{1,2})?$/.test(vatRate)
    ) {
      return null;
    }
    try {
      return calculateBill({
        items,
        discount,
        vatApplied,
        vatRate,
      });
    } catch (error) {
      if (error instanceof RangeError) return null;
      throw error;
    }
  }, [items, discount, vatApplied, vatRate]);

  function updateItem(index: number, field: keyof BillItemValue, value: string) {
    setItems((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ));
  }

  return (
    <form action={formAction} className="space-y-7">
      <p className="text-sm text-text-secondary">
        Bill number: <span className="font-medium text-primary">{billNumber ?? "Automatically assigned when saved"}</span>
      </p>
      {state.error && (
        <p className="rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {state.error}
        </p>
      )}
      {Object.entries(state.fieldErrors ?? {}).map(([field, message]) => (
        <p className="text-sm text-error" key={field} role="status">
          {field === "items" ? message : `${field}: ${message}`}
        </p>
      ))}

      <section aria-labelledby="bill-information-title" className="border-b border-border pb-7">
        <h2 className="text-lg font-semibold text-primary" id="bill-information-title">Bill information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="form-label" htmlFor="clientId">Client</label>
            <select
              className="form-control"
              id="clientId"
              name="clientId"
              onChange={(event) => setClientId(event.target.value)}
              required
              value={clientId}
            >
              <option value="">Select an active client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.displayName}</option>
              ))}
            </select>
            {state.fieldErrors?.clientId && <p className="form-hint form-hint-error">{state.fieldErrors.clientId}</p>}
          </div>
          <div>
            <label className="form-label" htmlFor="billDate">Bill date</label>
            <input
              className="form-control"
              defaultValue={initial?.billDate ?? today}
              id="billDate"
              max="9999-12-31"
              name="billDate"
              required
              type="date"
            />
            {state.fieldErrors?.billDate && <p className="form-hint form-hint-error">{state.fieldErrors.billDate}</p>}
          </div>
          <div>
            <label className="form-label" htmlFor="dueDate">Due date <span className="font-normal text-text-secondary">(optional)</span></label>
            <input className="form-control" defaultValue={initial?.dueDate} id="dueDate" name="dueDate" type="date" />
            {state.fieldErrors?.dueDate && <p className="form-hint form-hint-error">{state.fieldErrors.dueDate}</p>}
          </div>
        </div>
        {selectedClient && (
          <div className="mt-4 border-l-2 border-secondary pl-3 text-sm text-text-secondary" aria-live="polite">
            <p className="font-medium text-text">{selectedClient.displayName}</p>
            {selectedClient.contactPerson && <p>Contact: {selectedClient.contactPerson}</p>}
            <p>{[selectedClient.phone, selectedClient.email, selectedClient.panNumber ? `PAN ${selectedClient.panNumber}` : null].filter(Boolean).join(" · ") || "No contact or PAN details on file."}</p>
            {clientAddress && <p>{clientAddress}</p>}
            <p>{selectedClient.vatRegistered ? `VAT registered${selectedClient.vatNumber ? ` · ${selectedClient.vatNumber}` : ""}` : "Not VAT registered"}</p>
          </div>
        )}
      </section>

      <section aria-labelledby="bill-items-title" className="border-b border-border pb-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-primary" id="bill-items-title">Services</h2>
            <p className="text-sm text-text-secondary">Enter quantities and rates; line amounts are calculated automatically.</p>
          </div>
          <button
            className="button button-secondary min-h-10 shrink-0 px-3 text-sm"
            onClick={() => setItems((current) => [...current, { ...blankItem }])}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Add item
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {items.map((item, index) => {
            let amount: bigint | null = null;
            if (/^\d{1,9}(?:\.\d{1,3})?$/.test(item.quantity) && /^\d{1,12}(?:\.\d{1,2})?$/.test(item.rate)) {
              amount = calculateBill({
                items: [item],
                discount: "0",
                vatApplied: false,
                vatRate: "0",
              }).itemAmounts[0].amount;
            }
            return (
              <fieldset className="grid gap-3 border-b border-border pb-4 last:border-b-0 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_minmax(6rem,0.7fr)_minmax(6rem,0.8fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto]" key={index}>
                <legend className="sr-only">Service item {index + 1}</legend>
                <div>
                  <label className="form-label" htmlFor={`description-${index}`}>Service description</label>
                  <input className="form-control" id={`description-${index}`} maxLength={500} name="itemDescription" onChange={(event) => updateItem(index, "description", event.target.value)} required value={item.description} />
                </div>
                <div>
                  <label className="form-label" htmlFor={`quantity-${index}`}>Quantity</label>
                  <input className="form-control" id={`quantity-${index}`} min="0.001" name="itemQuantity" onChange={(event) => updateItem(index, "quantity", event.target.value)} required step="0.001" type="number" value={item.quantity} />
                </div>
                <div>
                  <label className="form-label" htmlFor={`unit-${index}`}>Unit</label>
                  <input className="form-control" id={`unit-${index}`} maxLength={30} name="itemUnit" onChange={(event) => updateItem(index, "unit", event.target.value)} required value={item.unit} />
                </div>
                <div>
                  <label className="form-label" htmlFor={`rate-${index}`}>Rate ({currencyCode})</label>
                  <input className="form-control" id={`rate-${index}`} min="0" name="itemRate" onChange={(event) => updateItem(index, "rate", event.target.value)} required step="0.01" type="number" value={item.rate} />
                </div>
                <div>
                  <span className="form-label">Amount</span>
                  <p className="flex min-h-11 items-center text-sm font-medium text-text" aria-live="polite">
                    {amount === null ? "—" : formatCurrency(amount, currencyCode)}
                  </p>
                </div>
                <div className="flex items-end">
                  <button
                    aria-label={`Remove service item ${index + 1}`}
                    className="mb-1 inline-flex size-10 items-center justify-center rounded-sm border border-border text-text-secondary hover:border-error hover:text-error"
                    onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </button>
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="bill-totals-title" className="grid gap-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <div>
          <h2 className="text-lg font-semibold text-primary" id="bill-totals-title">Tax and notes</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="discount">Discount ({currencyCode})</label>
              <input className="form-control" id="discount" min="0" name="discount" onChange={(event) => setDiscount(event.target.value)} step="0.01" type="number" value={discount} />
              {state.fieldErrors?.discount && <p className="form-hint form-hint-error">{state.fieldErrors.discount}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="vatRate">VAT rate (%)</label>
              <input
                className="form-control"
                disabled={!selectedClient?.vatRegistered || !vatApplied}
                id="vatRate"
                max="100"
                min="0.01"
                name="vatRate"
                onChange={(event) => setVatRate(event.target.value)}
                step="0.01"
                type="number"
                value={vatRate}
              />
              {state.fieldErrors?.vatRate && <p className="form-hint form-hint-error">{state.fieldErrors.vatRate}</p>}
            </div>
            <label className={`flex min-h-11 items-center gap-2 text-sm ${selectedClient?.vatRegistered ? "text-text" : "text-text-secondary"}`}>
              <input
                checked={vatApplied}
                disabled={!selectedClient?.vatRegistered}
                name="vatApplied"
                onChange={(event) => setVatApplied(event.target.checked)}
                type="checkbox"
              />
              Apply VAT to this bill
            </label>
            {!selectedClient?.vatRegistered && (
              <p className="self-center text-xs text-text-secondary">VAT is unavailable unless the selected client is VAT-registered.</p>
            )}
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="notes">Notes <span className="font-normal text-text-secondary">(optional)</span></label>
              <textarea className="form-control min-h-24" id="notes" maxLength={5000} name="notes" defaultValue={initial?.notes} />
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-4 lg:ml-auto lg:w-full lg:max-w-sm">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Subtotal</dt><dd>{totals ? formatCurrency(totals.subtotal, currencyCode) : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Discount</dt><dd>{totals ? formatCurrency(totals.discount, currencyCode) : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Taxable amount</dt><dd>{totals ? formatCurrency(totals.taxableAmount, currencyCode) : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">VAT {vatApplied ? `(${vatRate || "0"}%)` : "(not applied)"}</dt><dd>{totals ? formatCurrency(totals.vatAmount, currencyCode) : "—"}</dd></div>
            <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold text-primary"><dt>Total</dt><dd>{totals ? formatCurrency(totals.totalAmount, currencyCode) : "—"}</dd></div>
          </dl>
          {totals && (
            <p className="mt-3 text-xs text-text-secondary">
              {amountInWords(totals.totalAmount)}
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
        <button className="button button-secondary" disabled={isPending} name="intent" type="submit" value="draft">
          Save draft
        </button>
        <button className="button button-primary" disabled={isPending} name="intent" type="submit" value="issue">
          {isPending ? "Saving…" : "Issue bill"}
        </button>
      </div>
    </form>
  );
}
