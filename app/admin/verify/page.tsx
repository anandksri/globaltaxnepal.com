import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPendingTwoFactorSession } from "@/lib/admin/auth";
import { VerifyTwoFactorForm } from "./verify-form";

export const metadata: Metadata = {
  title: "Two-factor verification",
};

export default async function VerifyTwoFactorPage() {
  if (!(await getPendingTwoFactorSession())) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
      <section
        aria-labelledby="admin-verify-title"
        className="w-full max-w-md border border-border bg-surface p-6 sm:p-9"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
          Global Tax Nepal
        </p>
        <h1
          className="mt-3 text-2xl font-semibold tracking-tight text-primary"
          id="admin-verify-title"
        >
          Verify your sign-in
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Enter the 6-digit code sent to the administrator Gmail address. The code expires in 10 minutes.
        </p>
        <VerifyTwoFactorForm />
      </section>
    </main>
  );
}
