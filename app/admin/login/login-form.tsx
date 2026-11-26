"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAdmin } from "@/app/admin/actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAdmin, {});

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <div>
        <label
          className="form-label"
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
          className="form-label"
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
      <Link className="block text-right text-sm font-medium text-secondary hover:text-primary" href="/admin/forgot-password">
        Forgot password?
      </Link>
      <label
        className="flex items-center gap-2 text-sm text-text"
        htmlFor="admin-remember-me"
      >
        <input
          className="size-4 accent-primary"
          id="admin-remember-me"
          name="rememberMe"
          type="checkbox"
          value="true"
        />
        <span>Remember me for 30 days</span>
      </label>
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
