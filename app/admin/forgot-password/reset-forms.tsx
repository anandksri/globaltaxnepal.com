"use client";

import { useActionState } from "react";
import { requestPasswordReset, resetPassword } from "./actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="form-label" htmlFor="reset-email">Email address</label>
        <input autoComplete="email" className="form-control" id="reset-email" maxLength={254} name="email" required type="email" />
      </div>
      {state.error && <p className="text-sm text-error" role="alert">{state.error}</p>}
      {state.success && <p className="text-sm text-success" role="status">{state.success}</p>}
      <button className="button button-primary w-full disabled:opacity-70" disabled={pending} type="submit">
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword.bind(null, token), {});
  return (
    <form action={action} className="space-y-5">
      {!state.success && <>
        <div>
          <label className="form-label" htmlFor="reset-password">New password</label>
          <input autoComplete="new-password" className="form-control" id="reset-password" minLength={11} maxLength={72} name="password" required type="password" />
          <p className="mt-1 text-xs text-text-secondary">Use 11–72 characters, up to 72 UTF-8 bytes.</p>
        </div>
        <div>
          <label className="form-label" htmlFor="reset-confirm-password">Confirm password</label>
          <input autoComplete="new-password" className="form-control" id="reset-confirm-password" maxLength={72} name="confirmPassword" required type="password" />
        </div>
        <button className="button button-primary w-full disabled:opacity-70" disabled={pending} type="submit">
          {pending ? "Resetting…" : "Reset password"}
        </button>
      </>}
      {state.error && <p className="text-sm text-error" role="alert">{state.error}</p>}
      {state.success && <p className="text-sm text-success" role="status">{state.success}</p>}
    </form>
  );
}
