import type { Metadata } from "next";
import Link from "next/link";
import { BillStatus } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { updateDetailsBill } from "../../actions";
import { DetailsBillForm } from "../../details-bill-form";
import { getDetailsBillForEdit } from "@/lib/admin/details-bills";
import { requirePermission } from "@/lib/admin/auth";
import { decryptSensitiveText } from "@/lib/admin/sensitive-data";

export const metadata: Metadata = { title: "Edit details bill" };
export const dynamic = "force-dynamic";

export default async function EditDetailsBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("BILLING", "EDIT");
  const { id } = await params;
  const validId = z.string().min(1).max(191).safeParse(id);
  if (!validId.success) notFound();
  const data = await getDetailsBillForEdit(validId.data);
  if (!data) notFound();
  if (data.bill.status !== BillStatus.DRAFT) redirect(`/admin/details-bills/${data.bill.id}`);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/details-bills/${data.bill.id}`}>
        ← Bill {data.bill.billNumber}
      </Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <DetailsBillForm
          action={updateDetailsBill.bind(null, data.bill.id)}
          billNumber={data.bill.billNumber}
          clients={data.clients}
          initial={{
            clientId: data.bill.clientId,
            billDate: data.bill.billDate.toISOString().slice(0, 10),
            companyName: data.bill.clientName,
            contact: data.bill.clientPhone ?? data.bill.contactPerson ?? "",
            accountPassword: decryptSensitiveText(data.bill.accountPassword),
            workDescription: data.bill.workDescription ?? data.bill.notes ?? "",
            paymentStatus: data.bill.paymentStatus === "PAID" ? "PAID" : "PENDING",
          }}
          today={new Date().toISOString().slice(0, 10)}
        />
      </section>
    </div>
  );
}
