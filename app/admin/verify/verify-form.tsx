"use client";

import { useActionState } from "react";
import {
  resendAdminTwoFactor,
  verifyAdminTwoFactor,
} from "@/app/admin/actions";

export function VerifyTwoFactorForm() {
  const [verifyState, verifyAction, isVerifying] = useActionState(
    verifyAdminTwoFactor,
    {},
  );
  const [resendState, resendAction, isResending] = useActionState(
    resendAdminTwoFactor,
    {},
  );

  return (
    <div className="mt-7 space-y-5">
      <form action={verifyAction} className="space-y-5">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-text"
            htmlFor="admin-two-factor-code"
          >
            Verification code
          </label>
          <input
            autoComplete="one-time-code"
            className="form-control text-center text-xl tracking-[0.35em]"
            id="admin-two-factor-code"
            inputMode="numeric"
            maxLength={6}
            name="code"
            pattern="[0-9]{6}"
            required
            type="text"
          />
        </div>
        {verifyState.error && (
          <p className="text-sm text-error" role="alert">
            {verifyState.error}
          </p>
        )}
        <button
          className="button button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isVerifying}
          type="submit"
        >
          {isVerifying ? "Verifying…" : "Verify and continue"}
        </button>
      </form>

      <form action={resendAction}>
        {resendState.error && (
          <p className="mb-3 text-sm text-error" role="alert">
            {resendState.error}
          </p>
        )}
        {resendState.success && (
          <p className="mb-3 text-sm text-success" role="status">
            {resendState.success}
          </p>
        )}
        <button
          className="button button-secondary w-full disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isResending}
          type="submit"
        >
          {isResending ? "Sending…" : "Send a new code"}
        </button>
      </form>
    </div>
  );
}
