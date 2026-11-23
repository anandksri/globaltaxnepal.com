import type { ReactNode } from "react";
import { isAdminAuthBypassed, requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "./admin-shell";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const admin = await requireAdmin();

  return <AdminShell admin={admin} authBypassed={isAdminAuthBypassed()}>{children}</AdminShell>;
}
