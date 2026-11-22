import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateClient } from "../../actions";
import { ClientForm, type ClientFormValues } from "../../client-form";
import { clientIdSchema } from "@/lib/admin/clients";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit client" };
export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("CLIENTS", "EDIT");
  const { id } = await params;
  const parsedId = clientIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const client = await prisma.client.findUnique({ where: { id: parsedId.data } });

  if (!client) notFound();

  const initialValues: ClientFormValues = {
    type: client.type,
    displayName: client.displayName,
    contactPerson: client.contactPerson ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    province: client.province ?? "",
    district: client.district ?? "",
    municipality: client.municipality ?? "",
    wardNumber: client.wardNumber?.toString() ?? "",
    streetAddress: client.streetAddress ?? client.address ?? "",
    panNumber: client.panNumber ?? "",
    vatRegistered: client.vatRegistered,
    vatNumber: client.vatNumber ?? "",
    registrationDate: client.registrationDate
      ? client.registrationDate.toISOString().slice(0, 10)
      : "",
    notes: client.notes ?? "",
    isActive: client.isActive,
  };
  const updateAction = updateClient.bind(null, client.id);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          className="text-sm font-medium text-secondary hover:text-primary"
          href={`/admin/clients/${client.id}`}
        >
          ← Client details
        </Link>
        <p className="mt-3 text-sm text-text-secondary">
          Update information for {client.displayName}.
        </p>
      </div>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <ClientForm
          action={updateAction}
          initialValues={initialValues}
          submitLabel="Save changes"
        />
      </section>
    </div>
  );
}
