import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
      <section
        aria-labelledby="admin-login-title"
        className="w-full max-w-md border border-border bg-surface p-6 sm:p-9"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
          Global Tax Nepal
        </p>
        <h1
          className="mt-3 text-2xl font-semibold tracking-tight text-primary"
          id="admin-login-title"
        >
          Admin sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Sign in with an authorized administrator account.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
