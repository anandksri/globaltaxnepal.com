"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import type { ClientActionState } from "./actions";

export type ClientFormValues = {
  type: "INDIVIDUAL" | "BUSINESS";
  displayName: string;
  contactPerson: string;
  email: string;
  phone: string;
  additionalContactName: string;
  additionalContactMobile: string;
  additionalContactAddress: string;
  additionalContactFirmName: string;
  province: string;
  district: string;
  municipality: string;
  wardNumber: string;
  streetAddress: string;
  panNumber: string;
  vatRegistered: boolean;
  vatNumber: string;
  registrationDate: string;
  notes: string;
  isActive: boolean;
};

const emptyValues: ClientFormValues = {
  type: "INDIVIDUAL",
  displayName: "",
  contactPerson: "",
  email: "",
  phone: "",
  additionalContactName: "",
  additionalContactMobile: "",
  additionalContactAddress: "",
  additionalContactFirmName: "",
  province: "",
  district: "",
  municipality: "",
  wardNumber: "",
  streetAddress: "",
  panNumber: "",
  vatRegistered: false,
  vatNumber: "",
  registrationDate: "",
  notes: "",
  isActive: true,
};

type ClientFormProps = {
  action: (
    state: ClientActionState,
    formData: FormData,
  ) => Promise<ClientActionState>;
  initialValues?: ClientFormValues;
  submitLabel: string;
  allowDocumentUpload?: boolean;
};

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-xs text-error" role="alert">
      {message}
    </p>
  ) : null;
}

function TextField({
  name,
  label,
  initialValue,
  required = false,
  type = "text",
  maxLength,
  autoComplete,
  error,
  inputMode,
  className,
}: {
  name: keyof ClientFormValues;
  label: string;
  initialValue: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "number" | "date";
  maxLength?: number;
  autoComplete?: string;
  error?: string;
  inputMode?: "numeric";
  className?: string;
}) {
  const id = `client-${name}`;

  return (
    <div className={className}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete={autoComplete}
        className="form-control"
        id={id}
        inputMode={inputMode}
        max={type === "number" ? 99 : undefined}
        maxLength={type === "number" ? undefined : maxLength}
        min={type === "number" ? 1 : undefined}
        name={name}
        required={required}
        type={type}
        defaultValue={initialValue}
      />
      {error && (
        <span id={`${id}-error`}>
          <FieldError message={error} />
        </span>
      )}
    </div>
  );
}

export function ClientForm({
  action,
  initialValues = emptyValues,
  submitLabel,
  allowDocumentUpload = false,
}: ClientFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [clientType, setClientType] = useState(initialValues.type);
  const [vatRegistered, setVatRegistered] = useState(
    initialValues.vatRegistered,
  );
  const [documentInputIds, setDocumentInputIds] = useState([0]);
  const nextDocumentInputId = useRef(1);

  return (
    <form action={formAction} className="space-y-7">
      <section aria-labelledby="basic-info-heading">
        <h2
          className="border-b border-border pb-3 text-base font-semibold text-primary"
          id="basic-info-heading"
        >
          Client details
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="client-type">
              Client type <span aria-hidden="true">*</span>
            </label>
            <select
              className="form-control"
              id="client-type"
              name="type"
              onChange={(event) =>
                setClientType(event.target.value as ClientFormValues["type"])
              }
              required
              value={clientType}
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="BUSINESS">Business</option>
            </select>
          </div>
          <TextField
            error={state.fieldErrors?.displayName}
            initialValue={initialValues.displayName}
            label={clientType === "BUSINESS" ? "Business name" : "Full name"}
            maxLength={200}
            name="displayName"
            required
            autoComplete="name"
          />
          <TextField
            error={state.fieldErrors?.panNumber}
            initialValue={initialValues.panNumber}
            label="PAN number"
            maxLength={9}
            name="panNumber"
            inputMode="numeric"
          />
          <TextField
            error={state.fieldErrors?.email}
            initialValue={initialValues.email}
            label="Email address"
            maxLength={254}
            name="email"
            type="email"
            autoComplete="email"
          />
          <TextField
            error={state.fieldErrors?.phone}
            initialValue={initialValues.phone}
            label="Mobile number"
            maxLength={40}
            name="phone"
            type="tel"
            autoComplete="tel"
            className={clientType === "INDIVIDUAL" ? "sm:col-span-2" : undefined}
          />
          {clientType === "BUSINESS" && (
            <TextField
              error={state.fieldErrors?.contactPerson}
              initialValue={initialValues.contactPerson}
              label="Contact person"
              maxLength={200}
              name="contactPerson"
              autoComplete="name"
            />
          )}
        </div>
      </section>

      <section aria-labelledby="additional-contact-heading">
        <h2
          className="border-b border-border pb-3 text-base font-semibold text-primary"
          id="additional-contact-heading"
        >
          Reference details
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextField
            error={state.fieldErrors?.additionalContactName}
            initialValue={initialValues.additionalContactName}
            label="Name"
            maxLength={200}
            name="additionalContactName"
          />
          <TextField
            error={state.fieldErrors?.additionalContactMobile}
            initialValue={initialValues.additionalContactMobile}
            label="Mobile"
            maxLength={40}
            name="additionalContactMobile"
            type="tel"
          />
          <TextField
            error={state.fieldErrors?.additionalContactFirmName}
            initialValue={initialValues.additionalContactFirmName}
            label="Firm name"
            maxLength={200}
            name="additionalContactFirmName"
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="client-additionalContactAddress">
              Address
            </label>
            <textarea
              aria-invalid={Boolean(state.fieldErrors?.additionalContactAddress)}
              className="form-control min-h-24 resize-y"
              defaultValue={initialValues.additionalContactAddress}
              id="client-additionalContactAddress"
              maxLength={500}
              name="additionalContactAddress"
              rows={3}
            />
            <FieldError message={state.fieldErrors?.additionalContactAddress} />
          </div>
        </div>
      </section>

      <section aria-labelledby="address-info-heading">
        <h2
          className="border-b border-border pb-3 text-base font-semibold text-primary"
          id="address-info-heading"
        >
          Address information
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            error={state.fieldErrors?.province}
            initialValue={initialValues.province}
            label="Province"
            maxLength={100}
            name="province"
          />
          <TextField
            error={state.fieldErrors?.district}
            initialValue={initialValues.district}
            label="District"
            maxLength={100}
            name="district"
          />
          <TextField
            error={state.fieldErrors?.municipality}
            initialValue={initialValues.municipality}
            label="Municipality"
            maxLength={150}
            name="municipality"
          />
          <TextField
            error={state.fieldErrors?.wardNumber}
            initialValue={initialValues.wardNumber}
            label="Ward number"
            maxLength={2}
            name="wardNumber"
            type="number"
            inputMode="numeric"
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="form-label" htmlFor="client-streetAddress">
              Street / Address
            </label>
            <textarea
              aria-invalid={Boolean(state.fieldErrors?.streetAddress)}
              className="form-control min-h-24 resize-y"
              defaultValue={initialValues.streetAddress}
              id="client-streetAddress"
              maxLength={500}
              name="streetAddress"
              rows={3}
            />
            <FieldError message={state.fieldErrors?.streetAddress} />
          </div>
        </div>
      </section>

      <section aria-labelledby="tax-info-heading">
        <h2
          className="border-b border-border pb-3 text-base font-semibold text-primary"
          id="tax-info-heading"
        >
          Tax information
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="client-vatRegistered">
              VAT registration status
            </label>
            <select
              className="form-control"
              id="client-vatRegistered"
              name="vatRegistered"
              onChange={(event) =>
                setVatRegistered(event.target.value === "true")
              }
              value={String(vatRegistered)}
            >
              <option value="false">Not registered</option>
              <option value="true">Registered</option>
            </select>
          </div>
          <TextField
            error={state.fieldErrors?.vatNumber}
            initialValue={initialValues.vatNumber}
            label="VAT number"
            maxLength={30}
            name="vatNumber"
          />
          <TextField
            error={state.fieldErrors?.registrationDate}
            initialValue={initialValues.registrationDate}
            label="Registration date"
            name="registrationDate"
            type="date"
          />
        </div>
      </section>

      <section aria-labelledby="additional-info-heading">
        <h2
          className="border-b border-border pb-3 text-base font-semibold text-primary"
          id="additional-info-heading"
        >
          Additional information
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="client-isActive">
              Client status
            </label>
            <select
              className="form-control"
              defaultValue={String(initialValues.isActive)}
              id="client-isActive"
              name="isActive"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="client-notes">
              Client notes
            </label>
            <textarea
              aria-invalid={Boolean(state.fieldErrors?.notes)}
              className="form-control min-h-28 resize-y"
              defaultValue={initialValues.notes}
              id="client-notes"
              maxLength={5000}
              name="notes"
              rows={4}
            />
            <FieldError message={state.fieldErrors?.notes} />
          </div>
        </div>
      </section>

      {allowDocumentUpload && (
        <section aria-labelledby="client-document-heading">
          <h2
            className="border-b border-border pb-3 text-base font-semibold text-primary"
            id="client-document-heading"
          >
            Document upload
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            Add up to 10 PAN certificates, certificates, or other documents. The combined upload limit is 10 MB.
          </p>
          <div className="mt-4 space-y-4">
            {documentInputIds.map((inputId, index) => (
              <div
                className="border border-border p-4 sm:p-5"
                key={inputId}
              >
                <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-semibold text-primary">
                    Document {index + 1}
                  </h3>
                  {documentInputIds.length > 1 && (
                    <button
                      aria-label={`Remove document ${index + 1}`}
                      className="button button-secondary !px-3"
                      onClick={() =>
                        setDocumentInputIds((current) =>
                          current.filter((id) => id !== inputId),
                        )
                      }
                      type="button"
                    >
                      <X aria-hidden="true" size={18} />
                    </button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="form-label" htmlFor={`client-documentTitle-${inputId}`}>
                      Name of file
                    </label>
                    <input
                      className="form-control"
                      id={`client-documentTitle-${inputId}`}
                      maxLength={200}
                      name="documentTitles"
                      placeholder="Defaults to the selected file name"
                      type="text"
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor={`client-documentCategory-${inputId}`}>
                      Document type
                    </label>
                    <select
                      className="form-control"
                      defaultValue="OTHER"
                      id={`client-documentCategory-${inputId}`}
                      name="documentCategories"
                    >
                      <option value="PAN_CERTIFICATE">PAN</option>
                      <option value="SUPPORTING_DOCUMENT">Certificate</option>
                      <option value="OTHER">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" htmlFor={`client-documentFile-${inputId}`}>
                      Attachment
                      <span className="font-normal text-text-secondary"> (PDF, JPG, PNG, WebP)</span>
                    </label>
                    <input
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      aria-invalid={Boolean(state.fieldErrors?.documentFile)}
                      className="form-control file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                      id={`client-documentFile-${inputId}`}
                      name="documentFiles"
                      type="file"
                    />
                    <FieldError message={state.fieldErrors?.documentFile} />
                  </div>
                  <div>
                    <label className="form-label" htmlFor={`client-documentDate-${inputId}`}>
                      Attachment date
                    </label>
                    <input
                      className="form-control"
                      id={`client-documentDate-${inputId}`}
                      name="documentDates"
                      type="date"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              className="button button-secondary"
              disabled={documentInputIds.length >= 10}
              onClick={() => {
                const inputId = nextDocumentInputId.current;
                nextDocumentInputId.current += 1;
                setDocumentInputIds((current) => [...current, inputId]);
              }}
              type="button"
            >
              <Plus aria-hidden="true" size={18} />
              Add another document
            </button>
            {state.fieldErrors?.documentMetadata && (
              <FieldError message={state.fieldErrors.documentMetadata} />
            )}
          </div>
          <div className="mt-5">
            <label className="form-label" htmlFor="client-documentNote">
              Document note <span className="font-normal text-text-secondary">(optional; applies to all uploaded documents)</span>
            </label>
            <textarea
              aria-invalid={Boolean(state.fieldErrors?.documentNote)}
              className="form-control min-h-24 resize-y"
              id="client-documentNote"
              maxLength={1000}
              name="documentNote"
              rows={3}
            />
            <FieldError message={state.fieldErrors?.documentNote} />
          </div>
        </section>
      )}

      {state.error && (
        <p
          className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <a className="button button-secondary" href="/admin/clients">
          Cancel
        </a>
        <button
          className="button button-primary disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
