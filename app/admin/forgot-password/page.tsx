import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./reset-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md space-y-5 border border-border bg-surface p-6 sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Global Tax Nepal</p>
          <h1 className="mt-2 text-2xl font-semibold text-primary">Forgot password?</h1>
          <p className="mt-2 text-sm text-text-secondary">Enter your account email and we&apos;ll send you a reset link.</p>
        </div>
        <ForgotPasswordForm />
        <Link className="block text-center text-sm font-medium text-secondary hover:text-primary" href="/admin/login">Return to sign in</Link>
      </section>
    </main>
  );
}
