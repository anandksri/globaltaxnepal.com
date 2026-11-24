import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "./admin-shell";
import { prisma } from "@/lib/prisma";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const admin = await requireAdmin();
  const notifications = admin.roleName === "SUPER_ADMIN"
    ? await prisma.notification.findMany({
        where: { userId: admin.id, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, body: true, taskId: true, createdAt: true },
      })
    : [];

  return <AdminShell admin={admin} notifications={notifications}>{children}</AdminShell>;
}
