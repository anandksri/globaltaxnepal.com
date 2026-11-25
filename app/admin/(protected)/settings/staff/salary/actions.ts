"use server";

import { AdminModule, PermissionAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { nepaliMonths } from "@/lib/admin/client-monthly-data";
import { parseSalaryAmounts, parseSalaryYear } from "@/lib/admin/staff-salary";
import { prisma } from "@/lib/prisma";

export type SalaryActionState = { error?: string; success?: string };

const manualSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  address: z.string().trim().max(500),
  designation: z.string().trim().max(150),
});

function manualDetails(data: FormData) {
  return manualSchema.safeParse(Object.fromEntries(
    ["name", "phone", "email", "address", "designation"].map((key) => [key, data.get(key)]),
  ));
}

export async function createManualStaff(_state: SalaryActionState, data: FormData): Promise<SalaryActionState> {
  await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.VIEW);
  const admin = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.CREATE);
  const details = manualDetails(data);
  const year = parseSalaryYear(data.get("year"));
  if (!details.success || !year.success) return { error: "Enter a name, valid email if provided, and a four-digit BS year." };
  let id: string;
  try {
    const record = await prisma.$transaction(async (tx) => {
      const staff = await tx.manualSalaryStaff.create({ data: {
        name: details.data.name, phone: details.data.phone || null, email: details.data.email || null,
        address: details.data.address || null, designation: details.data.designation || null,
      } });
      await tx.activityLog.create({ data: { actorId: admin.id, action: "MANUAL_SALARY_STAFF_CREATED", targetType: "ManualSalaryStaff", targetId: staff.id } });
      return staff;
    });
    id = record.id;
  } catch (error) {
    console.error("[staff-salary] Creating staff failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "Staff member could not be added. Please try again." };
  }
  revalidatePath("/admin/settings/staff/salary");
  redirect(`/admin/settings/staff/salary/manual/${id}?year=${year.data}`);
}

export async function saveSalary(
  kind: string, id: string, yearValue: string, _state: SalaryActionState, data: FormData,
): Promise<SalaryActionState> {
  await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.VIEW);
  const admin = await requirePermission(AdminModule.STAFF_MANAGEMENT, PermissionAction.EDIT);
  const year = parseSalaryYear(yearValue);
  if ((kind !== "account" && kind !== "manual") || !z.string().cuid().safeParse(id).success || !year.success) {
    return { error: "Staff member or BS year is invalid." };
  }
  const amounts = parseSalaryAmounts(Object.fromEntries(nepaliMonths.map((month) => [month.key, data.get(month.key)])));
  if (!amounts.success) return { error: amounts.error };
  const remarks = z.string().trim().max(5000).safeParse(data.get("remarks"));
  const details = kind === "manual" ? manualDetails(data) : null;
  if (!remarks.success || (details && !details.success)) return { error: "Check staff details and remarks, including the email address." };
  try {
    const saved = await prisma.$transaction(async (tx) => {
      if (kind === "account") {
        const user = await tx.user.findUnique({ where: { id }, select: { role: { select: { name: true } } } });
        if (!user || (user.role.name === "SUPER_ADMIN" && admin.roleName !== "SUPER_ADMIN")) return false;
        await tx.staffSalaryYear.upsert({
          where: { userId_year: { userId: id, year: year.data } },
          create: { userId: id, year: year.data, amounts: amounts.amounts, remarks: remarks.data || null },
          update: { amounts: amounts.amounts, remarks: remarks.data || null },
        });
      } else {
        const staff = await tx.manualSalaryStaff.findUnique({ where: { id }, select: { id: true } });
        if (!staff || !details?.success) return false;
        await tx.manualSalaryStaff.update({ where: { id }, data: {
          name: details.data.name, phone: details.data.phone || null, email: details.data.email || null,
          address: details.data.address || null, designation: details.data.designation || null,
        } });
        await tx.staffSalaryYear.upsert({
          where: { manualStaffId_year: { manualStaffId: id, year: year.data } },
          create: { manualStaffId: id, year: year.data, amounts: amounts.amounts, remarks: remarks.data || null },
          update: { amounts: amounts.amounts, remarks: remarks.data || null },
        });
      }
      await tx.activityLog.create({ data: { actorId: admin.id, action: "STAFF_SALARY_UPDATED", targetType: kind === "account" ? "User" : "ManualSalaryStaff", targetId: id, metadata: { year: year.data } } });
      return true;
    });
    if (!saved) return { error: "Staff member is unavailable." };
  } catch (error) {
    console.error("[staff-salary] Saving failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "Salary data could not be saved. Please try again." };
  }
  revalidatePath("/admin/settings/staff/salary");
  revalidatePath(`/admin/settings/staff/salary/${kind}/${id}`);
  return { success: "Salary data saved." };
}
