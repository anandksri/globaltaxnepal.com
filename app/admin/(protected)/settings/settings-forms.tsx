"use client";

import { useActionState, useState } from "react";
import type { AdminModule, PermissionAction } from "@prisma/client";
import {
  changeOwnPassword,
  completeStaffInvitation,
  createStaff,
  issueStaffInvitation,
  saveCompanySettings,
  saveRolePermissions,
  updateOwnAccount,
  updateStaff,
  type SettingsActionState,
  type StaffActionState,
} from "./actions";

type RoleOption = { id: string; name: string; description: string | null };
type CompanyData = {
  name: string | null; address: string | null; phone: string | null; email: string | null;
  website: string | null; panNumber: string | null; vatNumber: string | null; invoicePrefix: string | null;
  receiptVoucherPrefix: string | null; paymentVoucherPrefix: string | null; bankName: string | null;
  bankAccountName: string | null; bankAccountNumber: string | null; bankBranch: string | null;
  paymentInstructions: string | null; currencyCode: string; logoStorageKey: string | null;
};

function ActionMessage({ state }: { state: SettingsActionState }) {
  return (
    <>
      {state.error && <p className="border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">{state.error}</p>}
      {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
        <ul className="list-inside list-disc border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {Object.entries(state.fieldErrors).map(([field, message]) => <li key={field}>{field}: {message}</li>)}
        </ul>
      )}
      {state.success && <p className="border border-success/30 bg-success/5 px-4 py-3 text-sm text-success" role="status">{state.success}</p>}
    </>
  );
}

function Field({
  id, label, name, defaultValue = "", type = "text", maxLength,
}: {
  id: string; label: string; name: string; defaultValue?: string; type?: string; maxLength?: number;
}) {
  return <div><label className="form-label" htmlFor={id}>{label}</label><input className="form-control" defaultValue={defaultValue} id={id} maxLength={maxLength} name={name} type={type} /></div>;
}

export function CompanySettingsForm({ settings, canEdit }: { settings: CompanyData | null; canEdit: boolean }) {
  const [state, action, pending] = useActionState(saveCompanySettings, {});
  return (
    <form action={action} className="space-y-5">
      <ActionMessage state={state} />
      <fieldset className="space-y-4" disabled={!canEdit}>
        <legend className="mb-2 font-semibold text-primary">Company profile</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="company-name" label="Company name" name="name" defaultValue={settings?.name ?? "Global Tax Nepal"} maxLength={200} />
          <Field id="company-phone" label="Phone number" name="phone" defaultValue={settings?.phone ?? ""} maxLength={40} />
          <Field id="company-email" label="Email address" name="email" type="email" defaultValue={settings?.email ?? ""} maxLength={254} />
          <Field id="company-website" label="Website" name="website" type="url" defaultValue={settings?.website ?? ""} maxLength={255} />
          <div className="sm:col-span-2"><label className="form-label" htmlFor="company-address">Office address</label><textarea className="form-control min-h-20" defaultValue={settings?.address ?? ""} id="company-address" maxLength={500} name="address" /></div>
        </div>
      </fieldset>
      <fieldset className="space-y-4 border-t border-border pt-5" disabled={!canEdit}>
        <legend className="mb-2 font-semibold text-primary">Tax and document details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="company-pan" label="Company PAN number" name="panNumber" defaultValue={settings?.panNumber ?? ""} maxLength={20} />
          <Field id="company-vat" label="Company VAT number" name="vatNumber" defaultValue={settings?.vatNumber ?? ""} maxLength={30} />
          <Field id="company-invoice-prefix" label="Invoice number prefix" name="invoicePrefix" defaultValue={settings?.invoicePrefix ?? ""} maxLength={12} />
          <Field id="company-currency" label="Default currency code" name="currencyCode" defaultValue={settings?.currencyCode ?? "NPR"} maxLength={3} />
          <Field id="company-receipt-prefix" label="Receipt voucher prefix" name="receiptVoucherPrefix" defaultValue={settings?.receiptVoucherPrefix ?? ""} maxLength={12} />
          <Field id="company-payment-prefix" label="Payment voucher prefix" name="paymentVoucherPrefix" defaultValue={settings?.paymentVoucherPrefix ?? ""} maxLength={12} />
        </div>
      </fieldset>
      <fieldset className="space-y-4 border-t border-border pt-5" disabled={!canEdit}>
        <legend className="mb-2 font-semibold text-primary">Bank and payment information</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="company-bank" label="Bank name" name="bankName" defaultValue={settings?.bankName ?? ""} maxLength={150} />
          <Field id="company-account-name" label="Account name" name="bankAccountName" defaultValue={settings?.bankAccountName ?? ""} maxLength={200} />
          <Field id="company-account-number" label="Account number" name="bankAccountNumber" defaultValue={settings?.bankAccountNumber ?? ""} maxLength={100} />
          <Field id="company-bank-branch" label="Branch" name="bankBranch" defaultValue={settings?.bankBranch ?? ""} maxLength={150} />
          <div className="sm:col-span-2"><label className="form-label" htmlFor="company-payment-instructions">Payment instructions</label><textarea className="form-control min-h-24" defaultValue={settings?.paymentInstructions ?? ""} id="company-payment-instructions" maxLength={3000} name="paymentInstructions" /></div>
        </div>
      </fieldset>
      <div className="flex justify-end border-t border-border pt-4"><button className="button button-primary" disabled={pending || !canEdit} type="submit">{pending ? "Saving…" : "Save company settings"}</button></div>
    </form>
  );
}

export function CompanyLogoForm({ hasLogo, canEdit }: { hasLogo: boolean; canEdit: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [logoSaved, setLogoSaved] = useState(hasLogo);
  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/admin/settings/logo", { method: "POST", body: formData });
      const result = await response.json() as { error?: string; success?: string };
      setMessage(response.ok ? result.success ?? "Logo saved." : result.error ?? "Logo upload failed.");
      if (response.ok) setLogoSaved(true);
    } catch {
      setMessage("The logo could not be uploaded. Check your connection and private storage configuration.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={submit} className="space-y-3 border-t border-border pt-5">
      <div><label className="form-label" htmlFor="company-logo">Company logo</label><input accept="image/png,image/jpeg,image/webp" className="form-control" disabled={!canEdit} id="company-logo" name="file" required type="file" /><p className="form-hint">PNG, JPG, or WebP, up to 2 MB. Stored in private file storage.</p></div>
      {message && <p className="text-sm text-text-secondary" role="status">{message}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">{logoSaved ? "A company logo is currently saved." : "No company logo uploaded."}</p>
        <button className="button button-secondary" disabled={pending || !canEdit} type="submit">{pending ? "Uploading…" : "Upload logo"}</button>
      </div>
    </form>
  );
}

export function StaffForm({ roles }: { roles: RoleOption[] }) {
  const [state, action, pending] = useActionState(createStaff, {});
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="staff-name" label="Full name" name="name" maxLength={100} />
        <Field id="staff-email" label="Email address" name="email" type="email" maxLength={254} />
        <Field id="staff-phone" label="Mobile number" name="phone" maxLength={40} />
        <div><label className="form-label" htmlFor="staff-role">Role</label><select className="form-control" defaultValue="" id="staff-role" name="roleId" required><option value="">Select a role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name.replaceAll("_", " ")}</option>)}</select></div>
      </div>
      {state.invitePath && <InviteNotice path={state.invitePath} />}
      <div className="flex justify-end border-t border-border pt-4"><button className="button button-primary" disabled={pending} type="submit">{pending ? "Creating…" : "Create staff account"}</button></div>
      <p className="text-sm text-text-secondary">No password is shown or stored in plaintext. Share the generated, one-time setup link with the staff member.</p>
    </form>
  );
}

export function StaffEditForm({
  user,
  roles,
}: {
  user: { id: string; name: string | null; email: string; phone: string | null; isActive: boolean; roleId: string };
  roles: RoleOption[];
}) {
  const [state, action, pending] = useActionState(updateStaff.bind(null, user.id), {});
  const [inviteState, inviteAction, invitePending] = useActionState(issueStaffInvitation.bind(null, user.id), {});
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <ActionMessage state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="staff-name" label="Full name" name="name" defaultValue={user.name ?? ""} maxLength={100} />
          <Field id="staff-email" label="Email address" name="email" type="email" defaultValue={user.email} maxLength={254} />
          <Field id="staff-phone" label="Mobile number" name="phone" defaultValue={user.phone ?? ""} maxLength={40} />
          <div><label className="form-label" htmlFor="staff-role">Role</label><select className="form-control" defaultValue={user.roleId} id="staff-role" name="roleId" required>{roles.map((role) => <option key={role.id} value={role.id}>{role.name.replaceAll("_", " ")}</option>)}</select></div>
          <div><label className="form-label" htmlFor="staff-status">Account status</label><select className="form-control" defaultValue={String(user.isActive)} id="staff-status" name="isActive"><option value="true">Active</option><option value="false">Inactive</option></select></div>
        </div>
        <div className="flex justify-end border-t border-border pt-4"><button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save staff details"}</button></div>
      </form>
      <form action={inviteAction} className="space-y-3 border-t border-border pt-5">
        <h3 className="font-semibold text-primary">Password setup</h3>
        <p className="text-sm text-text-secondary">Create a new one-time password setup link. Any prior unused link will be invalidated.</p>
        <ActionMessage state={inviteState} />
        {inviteState.invitePath && <InviteNotice path={inviteState.invitePath} />}
        <button className="button button-secondary" disabled={invitePending || !user.isActive} type="submit">{invitePending ? "Creating link…" : "Create password setup link"}</button>
      </form>
    </div>
  );
}

function InviteNotice({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
  }
  return <div className="space-y-2 border border-border bg-background p-3" role="status"><p className="text-sm font-medium text-primary">One-time setup link (expires in 72 hours)</p><p className="break-all text-sm text-secondary">{path}</p><button className="button button-secondary min-h-9 px-3 text-sm" onClick={copy} type="button">{copied ? "Copied" : "Copy full link"}</button></div>;
}

export function RolePermissionForm({
  role,
  modules,
  actions,
  selected,
}: {
  role: RoleOption;
  modules: Array<{ value: AdminModule; label: string }>;
  actions: Array<{ value: PermissionAction; label: string }>;
  selected: Array<{ module: AdminModule; action: PermissionAction }>;
}) {
  const [state, formAction, pending] = useActionState(saveRolePermissions.bind(null, role.id), {});
  const isSuperAdmin = role.name === "SUPER_ADMIN";
  const selectedKeys = new Set(selected.map((item) => `${item.module}:${item.action}`));
  return (
    <form action={formAction} className="space-y-4 border border-border bg-surface p-4">
      <div><h2 className="font-semibold text-primary">{role.name.replaceAll("_", " ")}</h2><p className="text-sm text-text-secondary">{role.description}</p></div>
      <ActionMessage state={state} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wide text-text-secondary"><tr><th className="px-3 py-2">Module</th>{actions.map((action) => <th className="px-3 py-2" key={action.value}>{action.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {modules.map((module) => <tr key={module.value}>
              <th className="px-3 py-2 font-medium text-primary">{module.label}</th>
              {actions.map((permission) => {
                const key = `${module.value}:${permission.value}`;
                const checked = isSuperAdmin || selectedKeys.has(key);
                return <td className="px-3 py-2" key={permission.value}><input aria-label={`${role.name} ${permission.label} ${module.label}`} checked={checked} className="size-4 accent-secondary" disabled={isSuperAdmin} name="permission" readOnly={isSuperAdmin} type="checkbox" value={key} /></td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
      {isSuperAdmin ? <p className="text-sm text-text-secondary">Super Admin permissions are fixed and cannot be revoked.</p> : <div className="flex justify-end"><button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save permissions"}</button></div>}
    </form>
  );
}

export function AccountProfileForm({ user }: {
  user: { name: string | null; email: string; phone: string | null };
}) {
  const [state, action, pending] = useActionState(updateOwnAccount, {});
  return <form action={action} className="space-y-4"><h2 className="font-semibold text-primary">Profile information</h2><ActionMessage state={state} /><div className="grid gap-4 sm:grid-cols-2"><Field id="profile-name" label="Full name" name="name" defaultValue={user.name ?? ""} maxLength={100} /><Field id="profile-email" label="Email address" name="email" type="email" defaultValue={user.email} maxLength={254} /><Field id="profile-phone" label="Mobile number" name="phone" defaultValue={user.phone ?? ""} maxLength={40} /></div><div className="flex justify-end"><button className="button button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save profile"}</button></div></form>;
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, {});
  return <form action={action} className="space-y-4"><h2 className="font-semibold text-primary">Change password</h2><ActionMessage state={state} /><Field id="current-password" label="Current password" name="currentPassword" type="password" /><Field id="new-password" label="New password (at least 12 characters)" name="newPassword" type="password" /><Field id="confirm-password" label="Confirm new password" name="confirmPassword" type="password" /><div className="flex justify-end"><button className="button button-primary" disabled={pending} type="submit">{pending ? "Changing…" : "Change password"}</button></div></form>;
}

export function InvitationPasswordForm({ token }: { token: string }) {
  const action = completeStaffInvitation.bind(null, token);
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-4"><ActionMessage state={state} /><Field id="invite-password" label="New password (at least 12 characters)" name="password" type="password" /><Field id="invite-confirm-password" label="Confirm password" name="confirmPassword" type="password" /><button className="button button-primary w-full" disabled={pending} type="submit">{pending ? "Saving password…" : "Set password"}</button></form>;
}
