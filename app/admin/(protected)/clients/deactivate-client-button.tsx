"use client";

import { useActionState } from "react";

export function DeactivateClientButton({
  action,
}: {
  action: (
    state: { error?: string },
    formData: FormData,
  ) => Promise<{ error?: string }>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Deactivate this client? You can reactivate them by editing the record.")) {
          event.preventDefault();
        }
      }}
    >
      <button
        className="inline-flex min-h-10 items-center justify-center border border-error/40 px-3 text-sm font-medium text-error transition-colors duration-200 ease-out hover:bg-error/5 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Deactivating…" : "Deactivate"}
      </button>
      {state.error && (
        <p className="mt-2 text-sm text-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
