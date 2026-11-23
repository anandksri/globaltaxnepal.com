import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { logoutAdmin } from "@/app/admin/actions";
import { isAdminAuthBypassed, requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AccountProfileForm, ChangePasswordForm } from "../settings-forms";

export const metadata: Metadata = { title: "Account settings" };
export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const identity = await requireAdmin();
  const user = await prisma.user.findUnique({
    where: { id: identity.id },
    select: { name: true, email: true, phone: true, createdAt: true, role: { select: { name: true } } },
  });
  if (!user) return null;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="space-y-5 border border-border bg-surface p-5 sm:p-7">
        <AccountProfileForm user={user} />
        <dl className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Role</dt><dd className="mt-1 text-sm text-primary">{user.role.name.replaceAll("_", " ")}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Account created</dt><dd className="mt-1 text-sm text-primary">{user.createdAt.toLocaleDateString("en-NP", { dateStyle: "medium" })}</dd></div>
        </dl>
      </section>
      <section className="space-y-4 border border-border bg-surface p-5 sm:p-7">
        <ChangePasswordForm />
      </section>
      {!isAdminAuthBypassed() && <form action={logoutAdmin}><button className="button button-secondary" type="submit"><LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />Sign out</button></form>}
    </div>
  );
}
