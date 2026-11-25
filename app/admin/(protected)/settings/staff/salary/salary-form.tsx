"use client";

import { startTransition, useActionState } from "react";
import { nepaliMonths } from "@/lib/admin/client-monthly-data";
import type { SalaryActionState } from "./actions";

type ManualDetails = { name: string; phone: string; email: string; address: string; designation: string };

export function ManualStaffFields({ details, disabled }: { details: ManualDetails; disabled: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    {([
      ["name", "Name", 100, "text"], ["phone", "Mobile", 40, "tel"], ["email", "Email", 254, "email"],
      ["address", "Address", 500, "text"], ["designation", "Designation", 150, "text"],
    ] as const).map(([name, label, maxLength, type]) => <div key={name}>
      <label className="form-label" htmlFor={`staff-${name}`}>{label}{name === "name" ? " *" : ""}</label>
      <input className="form-control" defaultValue={details[name]} disabled={disabled} id={`staff-${name}`} maxLength={maxLength} name={name} required={name === "name"} type={type} />
    </div>)}
  </div>;
}

export function SalaryForm({ action, canEdit, year, amounts, remarks, manual }: {
  action: (state: SalaryActionState, data: FormData) => Promise<SalaryActionState>;
  canEdit: boolean; year: number; amounts: Record<string, string>; remarks: string; manual?: ManualDetails;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-5" onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }}>
    {state.error && <p className="border border-error/30 bg-error/5 p-3 text-sm text-error" role="alert">{state.error}</p>}
    {state.success && <p className="border border-success/30 p-3 text-sm text-success" role="status">{state.success}</p>}
    {manual && <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="mb-4 font-semibold text-primary">Manual staff details</h2>
      <ManualStaffFields details={manual} disabled={!canEdit} />
    </section>}
    <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="font-semibold text-primary">Salary paid — {year} BS</h2>
      <p className="mt-2 text-sm text-text-secondary">Enter the total paid for each month in NPR. Leave blank if no amount has been recorded. Saving replaces the values for this year and does not create payments or vouchers.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nepaliMonths.map((month) => <div key={month.key}>
          <label className="form-label" htmlFor={month.key}>{month.label}</label>
          <input className="form-control" defaultValue={amounts[month.key]} disabled={!canEdit} id={month.key} inputMode="decimal" maxLength={13} name={month.key} placeholder="Not recorded" />
        </div>)}
      </div>
      <div className="mt-5"><label className="form-label" htmlFor="salary-remarks">Remarks</label><textarea className="form-control min-h-24" defaultValue={remarks} disabled={!canEdit} id="salary-remarks" maxLength={5000} name="remarks" /></div>
    </section>
    {canEdit && <div className="flex justify-end"><button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save salary data"}</button></div>}
  </form>;
}

export function NewManualStaffForm({ action, year }: { action: (state: SalaryActionState, data: FormData) => Promise<SalaryActionState>; year: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-5 border border-border bg-surface p-5 sm:p-7">
    {state.error && <p className="text-sm text-error" role="alert">{state.error}</p>}
    <h2 className="font-semibold text-primary">Add manual staff member</h2>
    <p className="text-sm text-text-secondary">This creates a register entry, not a staff login account.</p>
    <ManualStaffFields details={{ name: "", phone: "", email: "", address: "", designation: "" }} disabled={false} />
    <div><label className="form-label" htmlFor="salary-year">BS year *</label><input className="form-control" defaultValue={year} id="salary-year" inputMode="numeric" maxLength={4} name="year" pattern="[2-9][0-9]{3}" required /></div>
    <button className="button button-primary" disabled={pending} type="submit">{pending ? "Adding…" : "Add staff member"}</button>
  </form>;
}
