"use client";

import { startTransition, useActionState } from "react";
import type { MonthlyActionState } from "../../actions";

export function ManualClientForm({ action }: {
  action: (state: MonthlyActionState, data: FormData) => Promise<MonthlyActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-5" onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }}>
    {state.error && <p className="border border-error/30 bg-error/5 p-3 text-sm text-error" role="alert">{state.error}</p>}
    <section className="space-y-4 border border-border bg-surface p-5 sm:p-7">
      <h2 className="font-semibold text-primary">Add manual client</h2>
      <p className="text-sm text-text-secondary">This entry appears only in the monthly register, not in client management.</p>
      <div><label className="mb-1.5 block text-sm font-semibold text-text" htmlFor="manual-name">Client name *</label><input className="form-control" id="manual-name" maxLength={200} name="displayName" required /></div>
      <div><label className="mb-1.5 block text-sm font-semibold text-text" htmlFor="manual-phone">Mobile number</label><input className="form-control" id="manual-phone" maxLength={40} name="phone" type="tel" /></div>
      <div><label className="mb-1.5 block text-sm font-semibold text-text" htmlFor="manual-pan">PAN</label><input className="form-control" id="manual-pan" maxLength={20} name="panNumber" /></div>
    </section>
    <div className="flex justify-end"><button className="button button-primary" disabled={pending} type="submit">{pending ? "Adding…" : "Add manual client"}</button></div>
  </form>;
}
