import type { Metadata } from "next";
import { requirePermission } from "@/lib/admin/auth";
import { getCompanySettings } from "@/lib/admin/settings";
import { AdminModule, PermissionAction } from "@prisma/client";
import { CompanyLogoForm, CompanySettingsForm } from "./settings-forms";

export const metadata: Metadata = { title: "Company settings" };
export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const admin = await requirePermission(AdminModule.SETTINGS, PermissionAction.VIEW);
  const canEdit = admin.roleName === "SUPER_ADMIN" || admin.permissions.some((permission) =>
    permission.module === AdminModule.SETTINGS && permission.action === PermissionAction.EDIT
  );
  const settings = await getCompanySettings();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="border border-border bg-surface p-5 sm:p-7">
        <CompanySettingsForm canEdit={canEdit} settings={settings} />
        <CompanyLogoForm canEdit={canEdit} hasLogo={Boolean(settings?.logoStorageKey)} />
      </section>
    </div>
  );
}
