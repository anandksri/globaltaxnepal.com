"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export async function openTaskNotification(notificationId: string, taskId: string) {
  const admin = await requireAdmin();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: admin.id },
    data: { isRead: true },
  });
  revalidatePath("/admin");
  redirect(`/admin/tax/compliance/${taskId}`);
}
