import type { Metadata } from "next";
import Link from "next/link";
import { BillStatus } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { BillForm } from "@/app/admin/(protected)/billing/bill-form";
import { updateDetailsBill } from "../../actions";
import { getDetailsBillForEdit } from "@/lib/admin/details-bills";

export const metadata: Metadata = { title: "Edit details bill" };
export const dynamic = "force-dynamic";

export default async function EditDetailsBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
        <BillForm
          action={updateDetailsBill.bind(null, data.bill.id)}
          billNumber={data.bill.billNumber}
          clients={data.clients}
          currencyCode={data.bill.currencyCode}
          initial={{
            clientId: data.bill.clientId,
            billDate: data.bill.billDate.toISOString().slice(0, 10),
            dueDate: data.bill.dueDate?.toISOString().slice(0, 10) ?? "",
            discount: data.bill.discount.toFixed(2),
            vatApplied: data.bill.vatApplied,
            vatRate: data.bill.vatRate.toFixed(2),
            notes: data.bill.notes ?? "",
            items: data.bill.items.map((item) => ({
              description: item.description,
              quantity: item.quantity.toString(),
              unit: item.unit,
              rate: item.rate.toFixed(2),
            })),
          }}
          today={new Date().toISOString().slice(0, 10)}
        />
      </section>
    </div>
  );
}
