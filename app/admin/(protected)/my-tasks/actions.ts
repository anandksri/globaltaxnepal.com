"use server";

import { ComplianceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

async function notifySuperAdmins(title: string, body: string, taskId: string) {
  const superAdmins = await prisma.user.findMany({
    where: { isActive: true, role: { name: "SUPER_ADMIN" } },
    select: { id: true, email: true, name: true },
  });
  await prisma.notification.createMany({
    data: superAdmins.map((admin) => ({
      userId: admin.id,
      title,
      body,
      taskId,
    })),
  });

  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;
  if (!smtpUser || !smtpPassword || !smtpFrom || superAdmins.length === 0) return;

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || "587"),
    secure: Number(process.env.SMTP_PORT || "587") === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });
  await transport.sendMail({
    from: smtpFrom,
    to: superAdmins.map((admin) => admin.email).join(", "),
    subject: title,
    text: body,
  });
}

export async function markAssignedTaskComplete(taskId: string) {
  const staff = await requireAdmin();
  const id = z.string().min(1).max(191).safeParse(taskId);
  if (!id.success) throw new Error("Invalid task.");

  const task = await prisma.complianceTask.findFirst({
    where: { id: id.data, assignedToId: staff.id },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });
  if (!task) throw new Error("This task is not assigned to you.");
  if (task.status === ComplianceStatus.COMPLETED) return;

  await prisma.$transaction(async (transaction) => {
    await transaction.complianceTask.update({
      where: { id: task.id },
      data: {
        status: ComplianceStatus.COMPLETED,
        completedAt: new Date(new Date().toISOString().slice(0, 10)),
      },
    });
    await transaction.activityLog.create({
      data: {
        actorId: staff.id,
        action: "COMPLIANCE_TASK_COMPLETED_BY_STAFF",
        targetType: "ComplianceTask",
        targetId: task.id,
        metadata: { title: task.title, completedBy: staff.email },
      },
    });
  });

  await notifySuperAdmins(
    "Staff task completed",
    `${staff.name || staff.email} marked "${task.title}" as done.`,
    task.id,
  ).catch((error) => {
    console.error("[admin-task] Super admin completion notification failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  });

  revalidatePath("/admin/my-tasks");
  revalidatePath("/admin/tax/compliance");
  revalidatePath("/admin");
}
