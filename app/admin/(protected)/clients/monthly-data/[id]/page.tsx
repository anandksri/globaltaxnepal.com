import { AdminModule, PermissionAction } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { nepaliMonths, parseMonthlyDates, type MonthlyDates } from "@/lib/admin/client-monthly-data";
import { prisma } from "@/lib/prisma";
import { saveMonthlyData } from "../actions";
import { MonthlyDataForm } from "../monthly-data-form";

export const dynamic = "force-dynamic";

export default async function ClientMonthlyPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(AdminModule.CLIENTS, PermissionAction.VIEW);
  await requirePermission(AdminModule.DOCUMENTS, PermissionAction.VIEW);
  const { id } = await params;
  if (!z.string().cuid().safeParse(id).success) notFound();
  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true, displayName: true, panNumber: true,
      documents: { orderBy: { createdAt: "desc" }, select: { id: true, title: true } },
      monthlyData: { select: { dates: true, remarks: true, documents: { select: { documentId: true } } } },
    },
  });
  if (!client) notFound();
  const parsed = client.monthlyData ? parseMonthlyDates(client.monthlyData.dates) : null;
  if (parsed && !parsed.success) throw new Error(`Invalid stored monthly data: ${parsed.error}`);
  const dates = parsed?.success ? parsed.dates : Object.fromEntries(nepaliMonths.map((month) => [month.key, ""])) as MonthlyDates;
  const can = (module: AdminModule, action: PermissionAction) => admin.roleName === "SUPER_ADMIN" ||
    admin.permissions.some((permission) => permission.module === module && permission.action === action);
  return <div className="mx-auto max-w-6xl space-y-5">
    <Link className="text-sm font-medium text-secondary" href="/admin/clients/monthly-data">← Client monthly data</Link>
    <section className="border border-border bg-surface p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-primary">{client.displayName}</h2>
      <p className="mt-1 text-sm text-text-secondary">PAN: {client.panNumber || "—"}</p>
    </section>
    <MonthlyDataForm
      action={saveMonthlyData.bind(null, client.id)}
      canEdit={can(AdminModule.CLIENTS, PermissionAction.EDIT)}
      canUpload={can(AdminModule.DOCUMENTS, PermissionAction.CREATE)}
      clientId={client.id}
      dates={dates}
      documents={client.documents}
      remarks={client.monthlyData?.remarks ?? ""}
      selected={client.monthlyData?.documents.map((document) => document.documentId) ?? []}
    />
  </div>;
}
