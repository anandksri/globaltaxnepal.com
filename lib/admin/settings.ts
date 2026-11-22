import "server-only";

import { AdminModule, PermissionAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const permissionModules = [
  { value: AdminModule.DASHBOARD, label: "Dashboard" },
  { value: AdminModule.CLIENTS, label: "Clients" },
  { value: AdminModule.BILLING, label: "Billing" },
  { value: AdminModule.VOUCHERS, label: "Vouchers" },
  { value: AdminModule.ACCOUNTS, label: "Income and expenses" },
  { value: AdminModule.DOCUMENTS, label: "Documents" },
  { value: AdminModule.TAX, label: "Tax management" },
  { value: AdminModule.REPORTS, label: "Reports" },
  { value: AdminModule.SETTINGS, label: "Company settings" },
  { value: AdminModule.STAFF_MANAGEMENT, label: "Staff management" },
];

export const permissionActions = [
  { value: PermissionAction.VIEW, label: "View" },
  { value: PermissionAction.CREATE, label: "Create" },
  { value: PermissionAction.EDIT, label: "Edit" },
  { value: PermissionAction.DELETE, label: "Delete" },
];

export async function getCompanySettings() {
  return prisma.companySettings.findUnique({ where: { id: "company" } });
}

export async function getStaffData() {
  const [users, roles] = await prisma.$transaction([
    prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
  ]);
  return { users, roles };
}

export async function getRoleData() {
  return prisma.role.findMany({
    orderBy: [{ name: "asc" }],
    include: { permissions: { orderBy: [{ module: "asc" }, { action: "asc" }] } },
  });
}

export async function getInvitation(tokenHash: string) {
  return prisma.userInvitation.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true } },
    select: { id: true, user: { select: { name: true, email: true } } },
  });
}
