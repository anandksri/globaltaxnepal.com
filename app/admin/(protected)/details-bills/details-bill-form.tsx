"use client";

import { useActionState, useRef, useState } from "react";
import { Printer, RotateCcw, Save } from "lucide-react";
import type { BillingActionState } from "@/app/admin/(protected)/billing/actions";

type ClientOption = {
  id: string;
  displayName: string;
  contactPerson: string | null;
  phone: string | null;
  panNumber: string | null;
  province: string | null;
  district: string | null;
  municipality: string | null;
  wardNumber: number | null;
  streetAddress: string | null;
  address: string | null;
};

type BoundAction = (
  state: BillingActionState,
  formData: FormData,
) => Promise<BillingActionState>;

type DetailsInitial = {
  clientId: string;
  billDate: string;
  companyName: string;
  contact: string;
  accountPassword: string;
  workDescription: string;
  paymentStatus: "PENDING" | "PAID";
};

export function DetailsBillForm({
  action,
  clients,
  today,
  billNumber,
  initial,
}: {
  action: BoundAction;
  clients: ClientOption[];
  today: string;
  billNumber?: string;
  initial?: DetailsInitial;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [useCustomNumber, setUseCustomNumber] = useState(Boolean(initial));
  const [customBillNumber, setCustomBillNumber] = useState(billNumber ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState(initial?.accountPassword ?? "");
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [workDescription, setWorkDescription] = useState(initial?.workDescription ?? "");
  const [paymentStatus, setPaymentStatus] = useState(initial?.paymentStatus ?? "PENDING");
  const [customerMode, setCustomerMode] = useState<"existing" | "manual">("existing");
  const [manualAddress, setManualAddress] = useState("");
  const [manualPan, setManualPan] = useState("");
  const [manualName, setManualName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const selectedClient = clients.find((client) => client.id === clientId);
  const userId = clientId;

  function clearForm() {
    formRef.current?.reset();
    setClientId("");
    setUseCustomNumber(false);
    setCustomBillNumber("");
    setShowPassword(false);
    setPassword("");
    setCompanyName("");
    setContact("");
    setWorkDescription("");
    setPaymentStatus("PENDING");
    setCustomerMode("existing");
    setManualAddress("");
    setManualPan("");
    setManualName("");
  }

  return (
    <form action={formAction} className="space-y-7" ref={formRef}>
      {state.error && (
        <p className="rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {state.error}
        </p>
      )}

      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="details-document-title">
        <h2 className="text-lg font-semibold text-primary" id="details-document-title">
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
                <input className="form-control bg-background text-text-secondary" readOnly value={billNumber ?? "Automatically assigned"} />
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

      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6" aria-labelledby="details-client-title">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-primary" id="details-client-title">
            <span className="mr-3 text-text-secondary">02</span>Client and work details
          </h2>
          <select
            aria-label="Customer type"
            className="form-control w-auto min-w-44"
            name="customerMode"
            onChange={(event) => setCustomerMode(event.target.value as "existing" | "manual")}
            value={customerMode}
          >
            <option value="existing">Existing customer</option>
            <option value="manual">Add manually</option>
          </select>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="clientId">Name <span className="text-error">*</span></label>
            {customerMode === "existing" ? (
              <select
                className="form-control"
                id="clientId"
                name="clientId"
                onChange={(event) => {
                  const id = event.target.value;
                  setClientId(id);
                  const client = clients.find((item) => item.id === id);
                  setCompanyName(client?.displayName ?? "");
                  setContact(client?.phone ?? client?.contactPerson ?? "");
                }}
                required
                value={clientId}
              >
                <option value="">Client name</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.displayName}</option>
                ))}
              </select>
            ) : (
              <input
                className="form-control"
                id="manualName"
                name="manualName"
                maxLength={200}
                onChange={(event) => setManualName(event.target.value)}
                placeholder="Client name"
                required
                value={manualName}
              />
            )}
            {state.fieldErrors?.clientId && <p className="form-hint form-hint-error">{state.fieldErrors.clientId}</p>}
          </div>
          <div>
            <label className="form-label" htmlFor="companyName">Company name</label>
            <input
              className="form-control"
              id="companyName"
              maxLength={200}
              name={customerMode === "manual" ? "manualCompanyName" : "companyName"}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Company name"
              value={companyName}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="detailsUserId">User ID</label>
            <input className="form-control" id="detailsUserId" readOnly value={userId} placeholder="User ID" />
          </div>
          <div>
            <label className="form-label" htmlFor="detailsContact">Contact</label>
            <input
              className="form-control"
              id="detailsContact"
              maxLength={40}
              name={customerMode === "manual" ? "manualContact" : "contact"}
              onChange={(event) => setContact(event.target.value)}
              placeholder="Contact number"
              value={contact}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="accountPassword">Password</label>
            <div className="relative">
              <input
                className="form-control pr-12"
                id="accountPassword"
                maxLength={500}
                name="accountPassword"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <p className="form-hint">Encrypted at rest with the application session secret.</p>
          </div>
          <div>
            <label className="form-label" htmlFor="paymentStatus">Payment status</label>
            <select
              className="form-control"
              id="paymentStatus"
              name="paymentStatus"
              onChange={(event) => setPaymentStatus(event.target.value as "PENDING" | "PAID")}
              value={paymentStatus}
            >
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="workDescription">Work</label>
            <textarea
              className="form-control min-h-28"
              id="workDescription"
              maxLength={5000}
              name="workDescription"
              onChange={(event) => setWorkDescription(event.target.value)}
              placeholder="Work or service details"
              value={workDescription}
            />
          </div>
        </div>
      </section>

      <input name="itemDescription" type="hidden" value={workDescription || "Details bill service"} />
      <input name="itemQuantity" type="hidden" value="1" />
      <input name="itemUnit" type="hidden" value="service" />
      <input name="itemRate" type="hidden" value="0.00" />
      <input name="discount" type="hidden" value="0.00" />
      <input name="vatApplied" type="hidden" value="" />
      <input name="vatRate" type="hidden" value="0.00" />
      <input name="dueDate" type="hidden" value="" />
      <input name="notes" type="hidden" value="" />
      <input name="manualAddress" type="hidden" value="" />
      <input name="manualPan" type="hidden" value="" />

      <div className="flex flex-wrap items-center gap-3">
        <button className="button button-primary" disabled={pending} name="intent" type="submit" value="issue">
          <Save aria-hidden="true" className="size-4" />
          {pending ? "Saving…" : "Save bill"}
        </button>
        <button className="button button-secondary" onClick={() => window.print()} type="button">
          <Printer aria-hidden="true" className="size-4" />
          Print
        </button>
        {billNumber && (
          <button className="button button-secondary" disabled type="button">Download PDF</button>
        )}
        <button className="ml-auto flex min-h-11 items-center gap-2 px-2 text-sm text-text-secondary hover:text-primary" onClick={clearForm} type="button">
          <RotateCcw aria-hidden="true" className="size-4" />
          Clear form
        </button>
      </div>
    </form>
  );
}
