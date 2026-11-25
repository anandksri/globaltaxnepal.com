"use client";

import { useActionState, useState } from "react";
import type { PaymentMethod, StudentApprovalStatus, StudentServiceType } from "@prisma/client";
import type { StudentActionState } from "./actions";

export type StudentFormValues = {
  studentName: string;
  mobile: string;
  address: string;
  panCompanyName: string;
  inquiryReference: string;
  admissionBatch: string;
  serviceTypes: StudentServiceType[];
  otherService: string;
  courseName: string;
  workDescription: string;
  assignedToId: string;
  expectedCompletionDate: string;
  totalAmount: string;
  receivedAmount: string;
  paymentMethod: PaymentMethod | "";
  dueDate: string;
  portalWebsite: string;
  portalUserId: string;
  receptionReceivedBy: string;
  receptionDate: string;
  checkingVerifiedBy: string;
  checkingDate: string;
  accountsCheckedBy: string;
  accountsCheckDate: string;
  approvalStatus: StudentApprovalStatus;
  approvedBy: string;
  approvalDate: string;
  remarks: string;
  discussionNotes: string;
};

const serviceOptions: Array<{ value: StudentServiceType; label: string }> = [
  { value: "STUDENT_ADMISSION", label: "Student admission" },
  { value: "PAN_REGISTRATION", label: "PAN registration" },
  { value: "VAT_REGISTRATION", label: "VAT registration" },
  { value: "COMPANY_REGISTRATION", label: "Company registration" },
  { value: "TAX_CLEARANCE", label: "Tax clearance" },
  { value: "ACCOUNTING_BOOKKEEPING", label: "Accounting / bookkeeping" },
  { value: "OTHER", label: "Other" },
];

type StaffOption = { id: string; name: string | null; email: string };

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-xs text-error" role="alert">
      {message}
    </p>
  ) : null;
}

function TextField({
  id,
  name,
  label,
  value,
  error,
  type = "text",
  required = false,
  maxLength,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  error?: string;
  type?: "text" | "email" | "tel" | "url" | "date";
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="form-label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        aria-invalid={Boolean(error)}
        className="form-control"
        defaultValue={value}
        id={id}
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
      <FieldError message={error} />
    </div>
  );
}

export function StudentForm({
  action,
  initialValues,
  staff,
  submitLabel,
}: {
  action: (
    state: StudentActionState,
    formData: FormData,
  ) => Promise<StudentActionState>;
  initialValues: StudentFormValues;
  staff: StaffOption[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [totalAmount, setTotalAmount] = useState(initialValues.totalAmount || "0");
  const [receivedAmount, setReceivedAmount] = useState(initialValues.receivedAmount || "0");
  const dueAmount = Math.max(
    0,
    (Number(totalAmount) || 0) - (Number(receivedAmount) || 0),
  ).toFixed(2);

  return (
    <form action={formAction} className="space-y-7">
      {state.error && (
        <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {state.error}
        </p>
      )}

      <section aria-labelledby="student-details-heading">
        <h2 className="border-b border-border pb-3 text-base font-semibold text-primary" id="student-details-heading">
          Student details
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="student-name" label="Student name" name="studentName" required value={initialValues.studentName} error={state.fieldErrors?.studentName} maxLength={200} />
          <TextField id="student-mobile" label="Mobile number" name="mobile" type="tel" value={initialValues.mobile} error={state.fieldErrors?.mobile} maxLength={40} />
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="student-address">Address</label>
            <textarea className="form-control min-h-20" defaultValue={initialValues.address} id="student-address" maxLength={500} name="address" rows={2} />
            <FieldError message={state.fieldErrors?.address} />
          </div>
          <TextField id="student-pan-company" label="PAN / Company name" name="panCompanyName" value={initialValues.panCompanyName} error={state.fieldErrors?.panCompanyName} maxLength={100} />
          <TextField id="student-reference" label="Inquiry / Reference" name="inquiryReference" value={initialValues.inquiryReference} error={state.fieldErrors?.inquiryReference} maxLength={200} />
          <TextField id="student-batch" label="Admission batch" name="admissionBatch" value={initialValues.admissionBatch} error={state.fieldErrors?.admissionBatch} maxLength={100} />
        </div>
      </section>

      <section aria-labelledby="student-service-heading">
        <h2 className="border-b border-border pb-3 text-base font-semibold text-primary" id="student-service-heading">
          Service / admission type
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {serviceOptions.map((option) => (
            <label className="flex min-h-11 items-center gap-2 border border-border bg-surface px-3 text-sm text-text" key={option.value}>
              <input
                className="size-4 accent-secondary"
                defaultChecked={initialValues.serviceTypes.includes(option.value)}
                name="serviceTypes"
                type="checkbox"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
        <FieldError message={state.fieldErrors?.serviceTypes} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="student-other-service" label="Other service (if applicable)" name="otherService" value={initialValues.otherService} error={state.fieldErrors?.otherService} maxLength={200} />
          <TextField id="student-course" label="Course name" name="courseName" value={initialValues.courseName} error={state.fieldErrors?.courseName} maxLength={200} />
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="student-work-description">Work description / course details</label>
            <textarea className="form-control min-h-24" defaultValue={initialValues.workDescription} id="student-work-description" maxLength={5000} name="workDescription" rows={3} />
            <FieldError message={state.fieldErrors?.workDescription} />
          </div>
          <div>
            <label className="form-label" htmlFor="student-assigned-to">Assigned staff</label>
            <select aria-invalid={Boolean(state.fieldErrors?.assignedToId)} className="form-control" defaultValue={initialValues.assignedToId} id="student-assigned-to" name="assignedToId">
              <option value="">Unassigned</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>{member.name || member.email}</option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.assignedToId} />
          </div>
          <TextField id="student-expected-completion" label="Expected completion" name="expectedCompletionDate" type="date" value={initialValues.expectedCompletionDate} error={state.fieldErrors?.expectedCompletionDate} />
        </div>
      </section>

      <section aria-labelledby="student-payment-heading">
        <h2 className="border-b border-border pb-3 text-base font-semibold text-primary" id="student-payment-heading">
          Payment details
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="form-label" htmlFor="student-total-amount">Total amount (NPR)</label>
            <input aria-invalid={Boolean(state.fieldErrors?.totalAmount)} className="form-control" id="student-total-amount" min="0" name="totalAmount" onChange={(event) => setTotalAmount(event.target.value)} step="0.01" type="number" value={totalAmount} />
            <FieldError message={state.fieldErrors?.totalAmount} />
          </div>
          <div>
            <label className="form-label" htmlFor="student-received-amount">Received amount (NPR)</label>
            <input aria-invalid={Boolean(state.fieldErrors?.receivedAmount)} className="form-control" id="student-received-amount" min="0" name="receivedAmount" onChange={(event) => setReceivedAmount(event.target.value)} step="0.01" type="number" value={receivedAmount} />
            <FieldError message={state.fieldErrors?.receivedAmount} />
          </div>
          <div>
            <label className="form-label" htmlFor="student-due-amount">Due amount (NPR)</label>
            <input className="form-control bg-background" id="student-due-amount" readOnly value={dueAmount} />
          </div>
          <div>
            <label className="form-label" htmlFor="student-payment-method">Payment method</label>
            <select className="form-control" defaultValue={initialValues.paymentMethod} id="student-payment-method" name="paymentMethod">
              <option value="">Select a method</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="DIGITAL_WALLET">QR / Wallet</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
            <FieldError message={state.fieldErrors?.paymentMethod} />
          </div>
          <TextField id="student-due-date" label="Due date" name="dueDate" type="date" value={initialValues.dueDate} error={state.fieldErrors?.dueDate} />
        </div>
      </section>

      <section aria-labelledby="student-portal-heading">
        <h2 className="border-b border-border pb-3 text-base font-semibold text-primary" id="student-portal-heading">
          Portal / login information
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="student-portal-website" label="Portal / website" name="portalWebsite" type="url" value={initialValues.portalWebsite} error={state.fieldErrors?.portalWebsite} maxLength={255} />
          <TextField id="student-portal-user" label="User ID / reference" name="portalUserId" value={initialValues.portalUserId} error={state.fieldErrors?.portalUserId} maxLength={255} />
          <div>
            <label className="form-label" htmlFor="student-portal-password">Portal password</label>
            <input aria-invalid={Boolean(state.fieldErrors?.portalPassword)} autoComplete="new-password" className="form-control" id="student-portal-password" maxLength={1000} name="portalPassword" placeholder="Optional; encrypted if provided" type="password" />
            <FieldError message={state.fieldErrors?.portalPassword} />
          </div>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          Portal passwords are encrypted at rest and never displayed after saving. On edit, leave this blank to keep the saved password.
        </p>
      </section>

      <section aria-labelledby="student-verification-heading">
        <h2 className="border-b border-border pb-3 text-base font-semibold text-primary" id="student-verification-heading">
          Verification &amp; approval
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField id="student-reception-by" label="Reception received by" name="receptionReceivedBy" value={initialValues.receptionReceivedBy} error={state.fieldErrors?.receptionReceivedBy} maxLength={100} />
          <TextField id="student-reception-date" label="Reception date" name="receptionDate" type="date" value={initialValues.receptionDate} error={state.fieldErrors?.receptionDate} />
          <TextField id="student-checking-by" label="Checking verified by" name="checkingVerifiedBy" value={initialValues.checkingVerifiedBy} error={state.fieldErrors?.checkingVerifiedBy} maxLength={100} />
          <TextField id="student-checking-date" label="Checking date" name="checkingDate" type="date" value={initialValues.checkingDate} error={state.fieldErrors?.checkingDate} />
          <TextField id="student-accounts-by" label="Accounts checked by" name="accountsCheckedBy" value={initialValues.accountsCheckedBy} error={state.fieldErrors?.accountsCheckedBy} maxLength={100} />
          <TextField id="student-accounts-date" label="Accounts check date" name="accountsCheckDate" type="date" value={initialValues.accountsCheckDate} error={state.fieldErrors?.accountsCheckDate} />
          <div>
            <label className="form-label" htmlFor="student-approval-status">Approval status</label>
            <select className="form-control" defaultValue={initialValues.approvalStatus} id="student-approval-status" name="approvalStatus">
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <TextField id="student-approved-by" label="Approved by" name="approvedBy" value={initialValues.approvedBy} error={state.fieldErrors?.approvedBy} maxLength={100} />
          <TextField id="student-approval-date" label="Approval date" name="approvalDate" type="date" value={initialValues.approvalDate} error={state.fieldErrors?.approvalDate} />
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="form-label" htmlFor="student-remarks">Remarks</label>
            <textarea className="form-control min-h-20" defaultValue={initialValues.remarks} id="student-remarks" maxLength={2000} name="remarks" rows={2} />
            <FieldError message={state.fieldErrors?.remarks} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="form-label" htmlFor="student-discussion-notes">Discussion / key notes</label>
            <textarea className="form-control min-h-24" defaultValue={initialValues.discussionNotes} id="student-discussion-notes" maxLength={5000} name="discussionNotes" rows={3} />
            <FieldError message={state.fieldErrors?.discussionNotes} />
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <a className="button button-secondary" href="/admin/students">Cancel</a>
        <button className="button button-primary disabled:cursor-not-allowed disabled:opacity-70" disabled={pending} type="submit">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
