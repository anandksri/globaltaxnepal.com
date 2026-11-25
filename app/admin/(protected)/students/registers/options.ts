import "server-only";

import { prisma } from "@/lib/prisma";
import type { RegisterKind } from "@/lib/admin/office-registers";
import type { RegisterOptions } from "./register-form";

export async function getRegisterOptions(kind: RegisterKind): Promise<RegisterOptions> {
  const [clients, staff, tasks, documents] = await Promise.all([
    prisma.client.findMany({ orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
    prisma.user.findMany({ orderBy: [{ name: "asc" }, { email: "asc" }], select: { id: true, name: true, email: true, isActive: true } }),
    prisma.complianceTask.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, clientId: true, client: { select: { displayName: true } } },
    }),
    kind === "staff-time"
      ? Promise.resolve([])
      : prisma.document.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, clientId: true } }),
  ]);
  return {
    clients: clients.map((client) => ({ id: client.id, label: client.displayName })),
    staff: staff.map((user) => ({ id: user.id, label: `${user.name || user.email}${user.isActive ? "" : " (inactive)"}` })),
    tasks: tasks.map((task) => ({
      id: task.id,
      label: `${task.title} · ${task.client?.displayName ?? "Company"} · ${task.status.replaceAll("_", " ")}`,
      clientId: task.clientId,
      status: task.status,
    })),
    documents: documents.map((document) => ({ id: document.id, label: document.title, clientId: document.clientId })),
  };
}
