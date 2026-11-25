"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import {
  AdminModule,
  PermissionAction,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requirePermission, requireSuperAdmin } from "@/lib/admin/auth";
import type { AdminIdentity } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export type SettingsActionState = { error?: string; success?: string; fieldErrors?: Record<string, string> };
export type StaffActionState = SettingsActionState & { invitePath?: string };

const optionalEmail = z.union([z.literal(""), z.string().trim().email().max(254)]);
const companySchema = z.object({
  name: z.string().trim().min(1, "Enter a company name.").max(200),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(40),
  email: optionalEmail,
  website: z.union([z.literal(""), z.string().trim().url().max(255)]),
  panNumber: z.string().trim().max(20),
  vatNumber: z.string().trim().max(30),
  invoicePrefix: z.string().trim().max(12).regex(/^[A-Za-z0-9-]*$/),
  receiptVoucherPrefix: z.string().trim().max(12).regex(/^[A-Za-z0-9-]*$/),
  paymentVoucherPrefix: z.string().trim().max(12).regex(/^[A-Za-z0-9-]*$/),
  bankName: z.string().trim().max(150),
  bankAccountName: z.string().trim().max(200),
  bankAccountNumber: z.string().trim().max(100),
  bankBranch: z.string().trim().max(150),
  paymentInstructions: z.string().trim().max(3000),
  currencyCode: z.string().trim().regex(/^[A-Z]{3}$/, "Enter a 3-letter currency code."),
});

function firstError(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function formString(data: FormData, key: string) {
  return data.get(key) ?? "";
}

function mayAssignRole(
  actor: AdminIdentity,
  role: { name: string; permissions: Array<{ module: AdminModule; action: PermissionAction }> },
) {
  return actor.roleName === "SUPER_ADMIN" || (
    role.name !== "SUPER_ADMIN" &&
    role.permissions.every((required) => actor.permissions.some((granted) =>
      granted.module === required.module && granted.action === required.action
    ))
  );
}

async function sendStaffSetupEmail(email: string, name: string | null, invitePath: string) {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;
  if (!smtpUser || !smtpPassword || !smtpFrom) {
    throw new Error("STAFF_SETUP_EMAIL_CONFIG_MISSING");
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://globaltaxnepal-com.vercel.app";
  const setupUrl = `${baseUrl}${invitePath}`;
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });
  await transport.sendMail({
    from: smtpFrom,
    to: email,
    subject: "Set up your Global Tax Nepal staff account",
    text: `Hello ${name || "Staff Member"},\n\nYour staff account has been created. Set your password using this one-time link:\n${setupUrl}\n\nThe link expires in 72 hours.`,
    html: `<p>Hello ${name || "Staff Member"},</p><p>Your staff account has been created.</p><p><a href="${setupUrl}" style="display:inline-block;padding:12px 18px;background:#172b4d;color:#fff;text-decoration:none;border-radius:6px">Create my password</a></p><p>This one-time link expires in 72 hours.</p>`,
  });
}

export async function saveCompanySettings(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const admin = await requirePermission(AdminModule.SETTINGS, PermissionAction.EDIT);
  const parsed = companySchema.safeParse(Object.fromEntries([
    "name", "address", "phone", "email", "website", "panNumber", "vatNumber",
    "invoicePrefix", "receiptVoucherPrefix", "paymentVoucherPrefix", "bankName",
    "bankAccountName", "bankAccountNumber", "bankBranch", "paymentInstructions", "currencyCode",
  ].map((key) => [key, formString(formData, key)])));
  if (!parsed.success) return { error: "Review the highlighted fields.", fieldErrors: firstError(parsed.error.issues) };
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.companySettings.upsert({
        where: { id: "company" },
        create: {
          id: "company",
          ...parsed.data,
          email: parsed.data.email || null,
          website: parsed.data.website || null,
          address: parsed.data.address || null,
          phone: parsed.data.phone || null,
          panNumber: parsed.data.panNumber || null,
          vatNumber: parsed.data.vatNumber || null,
          invoicePrefix: parsed.data.invoicePrefix || null,
          receiptVoucherPrefix: parsed.data.receiptVoucherPrefix || null,
          paymentVoucherPrefix: parsed.data.paymentVoucherPrefix || null,
          bankName: parsed.data.bankName || null,
          bankAccountName: parsed.data.bankAccountName || null,
          bankAccountNumber: parsed.data.bankAccountNumber || null,
          bankBranch: parsed.data.bankBranch || null,
          paymentInstructions: parsed.data.paymentInstructions || null,
        },
        update: {
          ...parsed.data,
          email: parsed.data.email || null,
          website: parsed.data.website || null,
          address: parsed.data.address || null,
          phone: parsed.data.phone || null,
          panNumber: parsed.data.panNumber || null,
          vatNumber: parsed.data.vatNumber || null,
          invoicePrefix: parsed.data.invoicePrefix || null,
          receiptVoucherPrefix: parsed.data.receiptVoucherPrefix || null,
          paymentVoucherPrefix: parsed.data.paymentVoucherPrefix || null,
          bankName: parsed.data.bankName || null,
          bankAccountName: parsed.data.bankAccountName || null,
          bankAccountNumber: parsed.data.bankAccountNumber || null,
          bankBranch: parsed.data.bankBranch || null,
          paymentInstructions: parsed.data.paymentInstructions || null,
        },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "COMPANY_SETTINGS_UPDATED",
          targetType: "CompanySettings",
          targetId: "company",
          metadata: { updatedFields: Object.keys(parsed.data) },
        },
      });
    });
  } catch (error) {
    console.error("[admin-settings] Company settings save failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "Company settings could not be saved. Please try again." };
  }
  for (const path of ["/admin/settings", "/admin", "/admin/billing", "/admin/details-bills", "/admin/receipt-vouchers", "/admin/payment-vouchers"]) {
    revalidatePath(path);
  }
  return { success: "Company settings saved." };
}

const staffCreateSchema = z.object({
  name: z.string().trim().min(1, "Enter the staff member's name.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40),
  roleId: z.string().trim().min(1).max(191),
});

export async function createStaff(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const admin = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.CREATE);
  const parsed = staffCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) return { error: "Review the staff details.", fieldErrors: firstError(parsed.error.issues) };
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    const user = await prisma.$transaction(async (transaction) => {
      const role = await transaction.role.findUnique({
        where: { id: parsed.data.roleId },
        select: { id: true, name: true, permissions: { select: { module: true, action: true } } },
      });
      if (!role) throw new Error("STAFF_ROLE_UNAVAILABLE");
      if (!mayAssignRole(admin, role)) throw new Error("STAFF_ROLE_ASSIGNMENT_RESTRICTED");
      const created = await transaction.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          passwordHash: await bcrypt.hash(randomUUID(), 12),
          roleId: role.id,
        },
        select: { id: true },
      });
      await transaction.userInvitation.create({
        data: { tokenHash, userId: created.id, createdById: admin.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      });
      await transaction.activityLog.create({
        data: { actorId: admin.id, action: "STAFF_INVITED", targetType: "User", targetId: created.id, metadata: { email: parsed.data.email, roleId: role.id } },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/admin/settings/staff");
    const invitePath = `/admin/invite/${token}`;
    try {
      await sendStaffSetupEmail(parsed.data.email, parsed.data.name, invitePath);
      return { success: "Staff account created and password setup email sent.", invitePath };
    } catch (error) {
      console.error("[admin-settings] Staff setup email failed.", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return {
        success: "Staff account created, but the setup email could not be sent.",
        invitePath,
      };
    }
  } catch (error) {
    if (error instanceof Error && error.message === "STAFF_ROLE_UNAVAILABLE") return { error: "Choose an available role." };
    if (error instanceof Error && error.message === "STAFF_ROLE_ASSIGNMENT_RESTRICTED") return { error: "You cannot assign a role with permissions you do not have." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "An account with this email already exists." };
    console.error("[admin-settings] Staff account creation failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The staff account could not be created." };
  }
}

export async function updateStaff(
  userId: string,
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const actor = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.EDIT);
  const parsedId = z.string().min(1).max(191).safeParse(userId);
  const data = staffCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    roleId: formData.get("roleId"),
  });
  const isActiveValue = z.enum(["true", "false"]).safeParse(formData.get("isActive"));
  if (!parsedId.success) return { error: "This staff account could not be found." };
  if (!data.success || !isActiveValue.success) return { error: "Review the staff details.", fieldErrors: data.success ? {} : firstError(data.error.issues) };
  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.user.findUnique({
        where: { id: parsedId.data },
        select: { isActive: true, role: { select: { name: true } } },
      });
      if (!current) throw new Error("STAFF_USER_MISSING");
      if (current.role.name === "SUPER_ADMIN" && actor.roleName !== "SUPER_ADMIN") throw new Error("SUPER_ADMIN_ACCOUNT_RESTRICTED");
      const role = await transaction.role.findUnique({
        where: { id: data.data.roleId },
        select: { name: true, permissions: { select: { module: true, action: true } } },
      });
      if (!role) throw new Error("STAFF_ROLE_UNAVAILABLE");
      if (!mayAssignRole(actor, role)) throw new Error("STAFF_ROLE_ASSIGNMENT_RESTRICTED");
      const willRemainSuperAdmin = isActiveValue.data === "true" && role.name === "SUPER_ADMIN";
      if (current.isActive && current.role.name === "SUPER_ADMIN" && !willRemainSuperAdmin) {
        const activeSuperAdmins = await transaction.user.count({ where: { isActive: true, role: { name: "SUPER_ADMIN" } } });
        if (activeSuperAdmins <= 1) throw new Error("LAST_SUPER_ADMIN");
      }
      await transaction.user.update({
        where: { id: parsedId.data },
        data: { name: data.data.name, email: data.data.email, phone: data.data.phone || null, roleId: data.data.roleId, isActive: isActiveValue.data === "true" },
      });
      if (isActiveValue.data === "false") {
        await transaction.userInvitation.updateMany({
          where: { userId: parsedId.data, usedAt: null },
          data: { usedAt: new Date() },
        });
      }
      await transaction.activityLog.create({
        data: { actorId: actor.id, action: "STAFF_ACCOUNT_UPDATED", targetType: "User", targetId: parsedId.data, metadata: { roleId: data.data.roleId, isActive: isActiveValue.data === "true" } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "STAFF_USER_MISSING") return { error: "This staff account could not be found." };
      if (error.message === "SUPER_ADMIN_ACCOUNT_RESTRICTED") return { error: "Only a Super Admin can manage a Super Admin account." };
      if (error.message === "STAFF_ROLE_UNAVAILABLE") return { error: "Choose an available role." };
      if (error.message === "STAFF_ROLE_ASSIGNMENT_RESTRICTED") return { error: "You cannot assign a role with permissions you do not have." };
      if (error.message === "LAST_SUPER_ADMIN") return { error: "The last active Super Admin cannot be deactivated or reassigned." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "An account with this email already exists." };
    console.error("[admin-settings] Staff account update failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The staff account could not be updated." };
  }
  revalidatePath("/admin/settings/staff");
  revalidatePath(`/admin/settings/staff/${parsedId.data}`);
  return { success: "Staff account updated." };
}

export async function issueStaffInvitation(
  userId: string,
  _state: StaffActionState,
  _formData: FormData,
): Promise<StaffActionState> {
  const admin = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.EDIT);
  const id = z.string().min(1).max(191).safeParse(userId);
  if (!id.success) return { error: "This staff account could not be found." };
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    const inviteUser = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: id.data },
        select: {
          id: true,
          isActive: true,
          name: true,
          email: true,
          role: { select: { name: true, permissions: { select: { module: true, action: true } } } },
        },
      });
      if (!user || !user.isActive) throw new Error("STAFF_USER_UNAVAILABLE");
      if (!mayAssignRole(admin, user.role)) throw new Error("STAFF_ROLE_ASSIGNMENT_RESTRICTED");
      await transaction.userInvitation.updateMany({ where: { userId: id.data, usedAt: null }, data: { usedAt: new Date() } });
      await transaction.userInvitation.create({
        data: { tokenHash, userId: id.data, createdById: admin.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
      });
      await transaction.activityLog.create({
        data: { actorId: admin.id, action: "STAFF_INVITATION_REISSUED", targetType: "User", targetId: id.data },
      });
      return user;
    });
    const invitePath = `/admin/invite/${token}`;
    try {
      await sendStaffSetupEmail(inviteUser.email, inviteUser.name, invitePath);
    } catch (error) {
      console.error("[admin-settings] Reissued staff setup email failed.", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return { success: "Setup link created, but the email could not be sent.", invitePath };
    }
    revalidatePath(`/admin/settings/staff/${id.data}`);
    return { success: "A new setup email was sent.", invitePath };
  } catch (error) {
    if (error instanceof Error && error.message === "STAFF_USER_UNAVAILABLE") return { error: "Only active staff accounts can receive an invitation." };
    if (error instanceof Error && error.message === "STAFF_ROLE_ASSIGNMENT_RESTRICTED") return { error: "You cannot reset the password for this account." };
    console.error("[admin-settings] Staff invitation could not be issued.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The setup invitation could not be issued." };
  }
}

export async function saveRolePermissions(
  roleId: string,
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const admin = await requireSuperAdmin();
  const id = z.string().min(1).max(191).safeParse(roleId);
  if (!id.success) return { error: "Role not found." };
  const parsed = z.array(z.string().min(1).max(64)).max(40).safeParse(formData.getAll("permission"));
  if (!parsed.success) return { error: "The selected permission list is invalid." };
  const permissions: Array<{ module: AdminModule; action: PermissionAction }> = [];
  const seenPermissions = new Set<string>();
  for (const value of parsed.data) {
    const [moduleValue, actionValue, extra] = value.split(":");
    const module = Object.values(AdminModule).find((candidate) => candidate === moduleValue);
    const action = Object.values(PermissionAction).find((candidate) => candidate === actionValue);
    if (!module || !action || extra !== undefined || seenPermissions.has(value)) {
      return { error: "The selected permission list is invalid." };
    }
    seenPermissions.add(value);
    permissions.push({ module, action });
  }
  try {
    await prisma.$transaction(async (transaction) => {
      const role = await transaction.role.findUnique({ where: { id: id.data }, select: { name: true } });
      if (!role) throw new Error("ROLE_NOT_FOUND");
      if (role.name === "SUPER_ADMIN") throw new Error("SUPER_ADMIN_PERMISSIONS_LOCKED");
      await transaction.rolePermission.deleteMany({ where: { roleId: id.data } });
      if (permissions.length) {
        await transaction.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: id.data, ...permission })) });
      }
      await transaction.activityLog.create({
        data: { actorId: admin.id, action: "ROLE_PERMISSIONS_UPDATED", targetType: "Role", targetId: id.data, metadata: { permissions } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "ROLE_NOT_FOUND") return { error: "Role not found." };
    if (error instanceof Error && error.message === "SUPER_ADMIN_PERMISSIONS_LOCKED") return { error: "Super Admin always retains full system access." };
    console.error("[admin-settings] Role permissions could not be saved.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "Role permissions could not be saved." };
  }
  revalidatePath("/admin/settings/roles");
  return { success: "Role permissions saved." };
}

export async function completeStaffInvitation(
  token: string,
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const tokenValue = z.string().min(40).max(100).safeParse(token);
  const password = z.string().min(11, "Use at least 11 characters.").max(72)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password exceeds 72 UTF-8 bytes.");
  const parsed = z.object({ password, confirmPassword: z.string() }).refine(
    (value) => value.password === value.confirmPassword,
    { path: ["confirmPassword"], message: "Passwords do not match." },
  ).safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!tokenValue.success) return { error: "This setup link is invalid or expired." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a valid password." };
  const tokenHash = createHash("sha256").update(tokenValue.data).digest("hex");
  const invitation = await prisma.userInvitation.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true } },
    select: { id: true, userId: true },
  });
  if (!invitation) return { error: "This setup link is invalid, expired, or already used." };
  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.userInvitation.updateMany({
        where: { id: invitation.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("INVITATION_ALREADY_USED");
      const updated = await transaction.user.updateMany({
        where: { id: invitation.userId, isActive: true },
        data: { passwordHash },
      });
      if (updated.count !== 1) throw new Error("INVITATION_USER_UNAVAILABLE");
      await transaction.activityLog.create({
        data: {
          actorId: invitation.userId,
          action: "STAFF_PASSWORD_SET",
          targetType: "User",
          targetId: invitation.userId,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITATION_ALREADY_USED") return { error: "This setup link was already used." };
    if (error instanceof Error && error.message === "INVITATION_USER_UNAVAILABLE") return { error: "This staff account is inactive. Ask an administrator to reactivate it and issue a new link." };
    console.error("[admin-settings] Invitation password setup failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "The password could not be set. Request a new setup link." };
  }
  return { success: "Password set. You can now sign in." };
}

export async function updateOwnAccount(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const admin = await requireAdmin();
  const parsed = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(40),
  }).safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: "Enter a valid name, email, and phone number.", fieldErrors: firstError(parsed.error.issues) };
  try {
    await prisma.user.update({ where: { id: admin.id }, data: { ...parsed.data, phone: parsed.data.phone || null } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "That email address is already in use." };
    console.error("[admin-settings] Account profile update failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "Your profile could not be updated." };
  }
  revalidatePath("/admin/settings/account");
  revalidatePath("/admin");
  return { success: "Profile updated." };
}

export async function changeOwnPassword(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const admin = await requireAdmin();
  const parsed = z.object({
    currentPassword: z.string().min(1).max(72),
    newPassword: z.string().min(11, "Use at least 11 characters.").max(72)
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password exceeds 72 UTF-8 bytes."),
    confirmPassword: z.string(),
  }).refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"], message: "Passwords do not match.",
  }).safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter valid password values." };
  const user = await prisma.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  try {
    await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) } });
  } catch (error) {
    console.error("[admin-settings] Password change failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "Password could not be changed." };
  }
  return { success: "Password changed." };
}
