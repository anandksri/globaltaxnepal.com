import type { Metadata } from "next";
import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvitationPasswordForm } from "../../(protected)/settings/settings-forms";
import { getInvitation } from "@/lib/admin/settings";

export const metadata: Metadata = { title: "Set your password" };
export const dynamic = "force-dynamic";

export default async function StaffInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) notFound();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await getInvitation(tokenHash);
  if (!invitation) notFound();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md space-y-5 border border-border bg-surface p-6 sm:p-8">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Global Tax Nepal</p><h1 className="mt-2 text-2xl font-semibold text-primary">Set your password</h1><p className="mt-2 text-sm text-text-secondary">Create a password for {invitation.user.email}. This invitation is single-use.</p></div>
        <InvitationPasswordForm token={token} />
        <Link className="block text-center text-sm font-medium text-secondary hover:text-primary" href="/admin/login">Return to sign in</Link>
      </section>
    </main>
  );
}
