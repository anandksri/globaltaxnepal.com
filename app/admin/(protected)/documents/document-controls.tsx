"use client";

import { useActionState } from "react";
import type { DocumentActionState } from "./actions";

type DeleteAction = (
  state: DocumentActionState,
  formData: FormData,
) => Promise<DocumentActionState>;

export function DeleteDocumentButton({ action }: { action: DeleteAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this document and its stored file? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <button className="button border border-error bg-surface text-error hover:bg-error/5" disabled={pending} type="submit">
        {pending ? "Deleting…" : "Delete document"}
      </button>
      {state.error && <p className="mt-2 text-sm text-error" role="alert">{state.error}</p>}
    </form>
  );
}
