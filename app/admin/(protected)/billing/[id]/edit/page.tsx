import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BillStatus } from "@prisma/client";
import { updateDraftBill } from "../../actions";
import { BillForm } from "../../bill-form";
import { getBillEditData } from "@/lib/admin/billing-data";
import { z } from "zod";

export const metadata: Metadata = { title: "Edit draft bill" };
export const dynamic = "force-dynamic";

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().min(1).max(191).safeParse(id);
  if (!parsedId.success) notFound();

  const data = await getBillEditData(parsedId.data);
  if (!data) notFound();
  if (data.bill.status !== BillStatus.DRAFT) redirect(`/admin/billing/${data.bill.id}`);

  const bill = data.bill;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/billing/${bill.id}`}>
          ← Bill {bill.billNumber}
        </Link>
        <p className="text-sm text-text-secondary">Draft bills only</p>
      </div>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <BillForm
          action={updateDraftBill.bind(null, bill.id)}
          billNumber={bill.billNumber}
          clients={data.clients}
          currencyCode={bill.currencyCode}
          initial={{
            clientId: bill.clientId,
            billDate: bill.billDate.toISOString().slice(0, 10),
            dueDate: bill.dueDate?.toISOString().slice(0, 10) ?? "",
            discount: bill.discount.toFixed(2),
            vatApplied: bill.vatApplied,
            vatRate: bill.vatRate.toFixed(2),
            notes: bill.notes ?? "",
            items: bill.items.map((item) => ({
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
