import { AdminModule, PermissionAction } from "@prisma/client";
import { requirePermission } from "@/lib/admin/auth";

export default async function StudentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(AdminModule.STUDENTS, PermissionAction.VIEW);
  return children;
}
