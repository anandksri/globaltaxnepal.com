import { AdminModule, PermissionAction } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { parseMonthlyDates } from "@/lib/admin/client-monthly-data";
import { prisma } from "@/lib/prisma";
import { saveManualClient } from "../../actions";
import { MonthlyDataForm } from "../../monthly-data-form";

export const dynamic = "force-dynamic";

export default async function ManualClientPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(AdminModule.CLIENTS, PermissionAction.VIEW);
  await requirePermission(AdminModule.DOCUMENTS, PermissionAction.VIEW);
  const { id } = await params;
  if (!z.string().cuid().safeParse(id).success) notFound();
  const [client, documents] = await Promise.all([
    prisma.manualMonthlyClient.findUnique({ where: { id }, include: { documents: { select: { documentId: true } } } }),
    prisma.document.findMany({ where: { clientId: null }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } }),
  ]);
  if (!client) notFound();
  const parsed = parseMonthlyDates(client.dates);
  if (!parsed.success) throw new Error(`Invalid stored monthly data: ${parsed.error}`);
  const can = (module: AdminModule, action: PermissionAction) => admin.roleName === "SUPER_ADMIN" ||
    admin.permissions.some((permission) => permission.module === module && permission.action === action);
  return <div className="mx-auto max-w-6xl space-y-5">
    <Link className="text-sm font-medium text-secondary" href="/admin/clients/monthly-data">← Client monthly data</Link>
    <MonthlyDataForm
      action={saveManualClient.bind(null, id)}
      canEdit={can(AdminModule.CLIENTS, PermissionAction.EDIT)}
      canUpload={can(AdminModule.DOCUMENTS, PermissionAction.CREATE)}
      clientId=""
      dates={parsed.dates}
      documents={documents}
      manualClient={{ displayName: client.displayName, phone: client.phone ?? "", panNumber: client.panNumber ?? "" }}
      remarks={client.remarks ?? ""}
      selected={client.documents.map((document) => document.documentId)}
    />
  </div>;
}
