import { PermissionAction } from "@prisma/client";
import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { createManualClient } from "../../actions";
import { ManualClientForm } from "./manual-client-form";

export default async function NewManualClientPage() {
  await requirePermission("CLIENTS", PermissionAction.CREATE);
  await requirePermission("DOCUMENTS", PermissionAction.VIEW);
  return <div className="mx-auto max-w-3xl space-y-5">
    <Link className="text-sm font-medium text-secondary" href="/admin/clients/monthly-data">← Client monthly data</Link>
    <ManualClientForm action={createManualClient} />
  </div>;
}
