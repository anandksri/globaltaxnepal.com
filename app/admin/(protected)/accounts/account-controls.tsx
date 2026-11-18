"use client";

import { useActionState } from "react";
import type { AccountActionState } from "./actions";

type CategoryAction = (
  state: AccountActionState,
  formData: FormData,
) => Promise<AccountActionState>;

type DeleteAction = (
  state: AccountActionState,
  formData: FormData,
) => Promise<AccountActionState>;

export function AddCategoryForm({
  action,
  label,
}: {
  action: CategoryAction;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <details className="border border-border bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-secondary focus-visible:outline">
        Add {label.toLowerCase()} category
      </summary>
      <form action={formAction} className="flex flex-wrap items-end gap-3 border-t border-border p-4">
        <div className="min-w-52 flex-1">
          <label className="form-label" htmlFor={`${label}-category-name`}>Category name</label>
          <input className="form-control" id={`${label}-category-name`} maxLength={100} name="name" required />
        </div>
        <button className="button button-secondary" disabled={pending} type="submit">{pending ? "Adding…" : "Add category"}</button>
        {state.error && <p className="w-full text-sm text-error" role="alert">{state.error}</p>}
        {state.success && <p className="w-full text-sm text-success" role="status">{state.success}</p>}
      </form>
    </details>
  );
}

export function DeleteAccountRecordForm({
  action,
  label,
}: {
  action: DeleteAction;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete this ${label.toLowerCase()} record? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <button className="button border border-error bg-surface text-error hover:bg-error/5" disabled={pending} type="submit">
        {pending ? "Deleting…" : `Delete ${label.toLowerCase()}`}
      </button>
      {state.error && <p className="mt-2 text-sm text-error" role="alert">{state.error}</p>}
    </form>
  );
}
