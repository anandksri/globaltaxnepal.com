"use client";

import { useActionState } from "react";
import { loginAdmin } from "@/app/admin/actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAdmin, {});

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <div>
        <label
          className="mb-1.5 block text-sm font-medium text-text"
          htmlFor="admin-email"
        >
          Email address
        </label>
        <input
          autoComplete="username"
          className="form-control"
          id="admin-email"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </div>
      <div>
        <label
          className="mb-1.5 block text-sm font-medium text-text"
          htmlFor="admin-password"
        >
          Password
        </label>
        <input
          autoComplete="current-password"
          className="form-control"
          id="admin-password"
          maxLength={72}
          name="password"
          required
          type="password"
        />
      </div>
      {state.error && (
        <p className="text-sm text-error" role="alert">
          {state.error}
        </p>
      )}
      <button
        className="button button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
