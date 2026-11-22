import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BillStatus, BillType, Prisma } from "@prisma/client";
import { Download, Pencil } from "lucide-react";
import { z } from "zod";
import { cancelDetailsBill, markDetailsBillPaid } from "../actions";
import {
  CancelDetailsBillForm,
  MarkDetailsBillPaidForm,
  PrintDetailsBillButton,
} from "../details-bill-controls";
import { formatCurrency, moneyToCents } from "@/lib/admin/billing";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Details bill" };
export const dynamic = "force-dynamic";

function dateLabel(date: Date | null) {
  return date?.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" }) ?? "—";
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words text-sm text-text">{value || "—"}</dd>
    </div>
  );
}

export default async function DetailsBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const validId = z.string().min(1).max(191).safeParse(id);
  if (!validId.success) notFound();
  const [bill, company] = await prisma.$transaction([
    prisma.bill.findUnique({
      where: { id: validId.data, billType: BillType.DETAILS },
      include: {
        items: { orderBy: { position: "asc" } },
        payments: {
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
          include: { receivedBy: { select: { name: true, email: true } } },
        },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "company" } }),
  ]);
  if (!bill) notFound();
  const paid = bill.payments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
  const outstanding = bill.totalAmount.sub(paid);
  const canPay = bill.status === BillStatus.ISSUED || bill.status === BillStatus.PARTIALLY_PAID;
  const canCancel = bill.status === BillStatus.DRAFT || bill.status === BillStatus.ISSUED;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/details-bills">← All details bills</Link>
        <div className="flex flex-wrap gap-2">
          {bill.status === BillStatus.DRAFT && (
            <Link className="button button-secondary" href={`/admin/details-bills/${bill.id}/edit`}>
              <Pencil aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Edit draft
            </Link>
          )}
          <a className="button button-secondary" href={`/admin/billing/${bill.id}/pdf`}>
            <Download aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Download PDF
          </a>
          <PrintDetailsBillButton />
        </div>
      </div>

      <section className="invoice-print border border-border bg-surface p-5 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div>
            <h2 className="text-xl font-semibold text-primary">{company?.name || "Global Tax Nepal"}</h2>
            <div className="mt-2 text-sm leading-6 text-text-secondary">
              {company?.address && <p>{company.address}</p>}
              {company?.phone && <p>{company.phone}</p>}
              {company?.email && <p>{company.email}</p>}
              {company?.website && <p>{company.website}</p>}
            </div>
          </div>
          <div className="text-right">
            <Image alt={company?.name || "Global Tax Nepal"} className="ml-auto h-auto w-52" height={68} priority src={company?.logoStorageKey ? "/admin/settings/logo" : "/assets/global-tax-nepal-logo.svg"} unoptimized={Boolean(company?.logoStorageKey)} width={390} />
            {company?.panNumber && <p className="mt-1 text-xs text-text-secondary">PAN: {company.panNumber}</p>}
            {company?.vatNumber && <p className="text-xs text-text-secondary">VAT: {company.vatNumber}</p>}
            <h2 className="mt-5 text-2xl font-semibold uppercase tracking-wide text-primary">Details Bill</h2>
            <p className="mt-1 font-medium text-text">{bill.billNumber}</p>
            <p className="text-sm text-text-secondary">{bill.status.replaceAll("_", " ")}</p>
          </div>
        </header>
        <div className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Client</h3>
            <p className="mt-2 font-semibold text-primary">{bill.clientName}</p>
            {bill.contactPerson && <p className="text-sm text-text-secondary">{bill.contactPerson}</p>}
            {bill.clientAddress && <p className="max-w-md text-sm text-text-secondary">{bill.clientAddress}</p>}
            {bill.clientPhone && <p className="text-sm text-text-secondary">{bill.clientPhone}</p>}
            {bill.clientEmail && <p className="text-sm text-text-secondary">{bill.clientEmail}</p>}
          </div>
          <dl className="grid content-start gap-4 sm:grid-cols-2">
            <Detail label="Bill date" value={dateLabel(bill.billDate)} />
            <Detail label="Due date" value={dateLabel(bill.dueDate)} />
            <Detail label="PAN" value={bill.clientPanNumber} />
            <Detail label="VAT number" value={bill.clientVatNumber} />
          </dl>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
                <th className="py-3 pr-3">Description</th>
                <th className="px-3 py-3 text-right">Quantity</th>
                <th className="px-3 py-3 text-right">Rate</th>
                <th className="py-3 pl-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bill.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-3">{item.description}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{item.quantity.toString()} {item.unit}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{formatCurrency(moneyToCents(item.rate.toFixed(2)), bill.currencyCode)}</td>
                  <td className="whitespace-nowrap py-3 pl-3 text-right">{formatCurrency(moneyToCents(item.amount.toFixed(2)), bill.currencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Subtotal</dt><dd>{formatCurrency(moneyToCents(bill.subtotal.toFixed(2)), bill.currencyCode)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Discount</dt><dd>{formatCurrency(moneyToCents(bill.discount.toFixed(2)), bill.currencyCode)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Taxable amount</dt><dd>{formatCurrency(moneyToCents(bill.taxableAmount.toFixed(2)), bill.currencyCode)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">VAT {bill.vatApplied ? `(${bill.vatRate.toFixed(2)}%)` : "(not applied)"}</dt><dd>{formatCurrency(moneyToCents(bill.vatAmount.toFixed(2)), bill.currencyCode)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold text-primary"><dt>Grand total</dt><dd>{formatCurrency(moneyToCents(bill.totalAmount.toFixed(2)), bill.currencyCode)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Amount paid</dt><dd>{formatCurrency(moneyToCents(paid.toFixed(2)), bill.currencyCode)}</dd></div>
            <div className="flex justify-between gap-4 font-semibold"><dt>Balance due</dt><dd>{formatCurrency(moneyToCents(outstanding.toFixed(2)), bill.currencyCode)}</dd></div>
          </dl>
        </div>
        {bill.notes && <p className="mt-5 whitespace-pre-wrap border-t border-border pt-4 text-sm">{bill.notes}</p>}
        {company?.paymentInstructions && <p className="mt-4 whitespace-pre-wrap text-sm text-text-secondary">{company.paymentInstructions}</p>}
        {(company?.bankName || company?.bankAccountName || company?.bankAccountNumber || company?.bankBranch) && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Bank details</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{[company.bankName, company.bankAccountName, company.bankAccountNumber, company.bankBranch].filter(Boolean).join(" · ")}</p>
          </div>
        )}
        <div className="mt-16 flex justify-end">
          <div className="w-56 border-t border-text pt-2 text-center text-xs text-text-secondary">Authorized signature</div>
        </div>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-7 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Status</p>
            <h2 className="mt-1 text-lg font-semibold text-primary">{bill.status.replaceAll("_", " ")}</h2>
          </div>
          <p className="text-sm text-text-secondary">Created by {bill.createdBy.name || bill.createdBy.email} · {dateLabel(bill.createdAt)}</p>
        </div>
        {bill.payments.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <h3 className="mb-2 font-semibold text-primary">Payments</h3>
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-text-secondary">
                <tr><th className="py-2">Date</th><th className="py-2">Method</th><th className="py-2">Reference</th><th className="py-2 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bill.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-2">{dateLabel(payment.paymentDate)}</td>
                    <td className="py-2">{payment.method.replaceAll("_", " ").toLowerCase()}</td>
                    <td className="py-2">{payment.reference || "—"}</td>
                    <td className="py-2 text-right">{formatCurrency(moneyToCents(payment.amount.toFixed(2)), bill.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canPay && outstanding.greaterThan(0) && <MarkDetailsBillPaidForm action={markDetailsBillPaid.bind(null, bill.id)} />}
        {canCancel && <CancelDetailsBillForm action={cancelDetailsBill.bind(null, bill.id)} />}
        {bill.status === BillStatus.CANCELLED && bill.cancellationReason && (
          <p className="mt-4 text-sm text-error">Cancellation reason: {bill.cancellationReason}</p>
        )}
      </section>
    </div>
  );
}
