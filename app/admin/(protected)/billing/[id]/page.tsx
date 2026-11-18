import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BillStatus, Prisma } from "@prisma/client";
import { Pencil } from "lucide-react";
import { cancelBill, recordPayment } from "../actions";
import { CancelBillForm, PaymentForm, PrintInvoiceButton } from "../bill-controls";
import {
  amountInWords,
  formatCurrency,
  getBillDisplayStatus,
  moneyToCents,
} from "@/lib/admin/billing";
import { getBillDetail } from "@/lib/admin/billing-data";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const metadata: Metadata = { title: "Bill details" };
export const dynamic = "force-dynamic";

const statusNames: Record<string, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

function formatDate(value: Date | null) {
  return value?.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" }) ?? "—";
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words text-sm text-text">{value || "—"}</dd>
    </div>
  );
}

export default async function BillDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().min(1).max(191).safeParse(id);
  if (!parsedId.success) notFound();

  const [bill, company] = await Promise.all([
    getBillDetail(parsedId.data),
    prisma.companySettings.findUnique({ where: { id: "company" } }),
  ]);
  if (!bill) notFound();

  const paid = bill.payments.reduce(
    (sum, payment) => sum.add(payment.amount),
    new Prisma.Decimal(0),
  );
  const outstanding = bill.totalAmount.sub(paid);
  const currencyCode = bill.currencyCode;
  const displayStatus = getBillDisplayStatus(
    bill.status,
    bill.dueDate,
    moneyToCents(outstanding.toFixed(2)),
  );
  const allowPayment = bill.status === BillStatus.ISSUED || bill.status === BillStatus.PARTIALLY_PAID;
  const allowCancel = bill.status === BillStatus.DRAFT || bill.status === BillStatus.ISSUED;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/billing">← All bills</Link>
        <div className="flex flex-wrap gap-2">
          {bill.status === BillStatus.DRAFT && (
            <Link className="button button-secondary" href={`/admin/billing/${bill.id}/edit`}>
              <Pencil aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Edit draft
            </Link>
          )}
          <a className="button button-secondary" href={`/admin/billing/${bill.id}/pdf`} rel="noreferrer" target="_blank">
            Download PDF
          </a>
          <PrintInvoiceButton />
        </div>
      </div>

      <section className="invoice-print border border-border bg-surface p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-primary">
              {company?.name || "Global Tax Nepal"}
            </h2>
            <div className="max-w-sm text-sm leading-6 text-text-secondary">
              {company?.address && <p>{company.address}</p>}
              {company?.phone && <p>{company.phone}</p>}
              {company?.email && <p>{company.email}</p>}
              {company?.website && <p>{company.website}</p>}
            </div>
          </div>
          <div className="text-right">
            <Image alt="Global Tax Nepal" className="ml-auto h-auto w-52" height={68} priority src="/assets/global-tax-nepal-logo.svg" width={390} />
            <h2 className="mt-5 text-2xl font-semibold uppercase tracking-wide text-primary">Invoice</h2>
            <p className="mt-1 font-medium text-text">{bill.billNumber}</p>
            <p className="text-sm text-text-secondary">{statusNames[displayStatus] ?? displayStatus}</p>
          </div>
        </div>

        <div className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Bill to</h3>
            <p className="mt-2 font-semibold text-primary">{bill.clientName}</p>
            {bill.contactPerson && <p className="text-sm text-text-secondary">{bill.contactPerson}</p>}
            {bill.clientAddress && <p className="max-w-md text-sm text-text-secondary">{bill.clientAddress}</p>}
            {bill.clientPhone && <p className="text-sm text-text-secondary">{bill.clientPhone}</p>}
            {bill.clientEmail && <p className="text-sm text-text-secondary">{bill.clientEmail}</p>}
          </div>
          <dl className="grid content-start gap-4 sm:grid-cols-2">
            <Detail label="Bill date" value={formatDate(bill.billDate)} />
            <Detail label="Due date" value={formatDate(bill.dueDate)} />
            <Detail label="Client PAN" value={bill.clientPanNumber} />
            <Detail label="Client VAT number" value={bill.clientVatNumber} />
          </dl>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
                <th className="py-3 pr-3 font-semibold">Description</th>
                <th className="px-3 py-3 text-right font-semibold">Quantity</th>
                <th className="px-3 py-3 text-right font-semibold">Rate</th>
                <th className="py-3 pl-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bill.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-3">{item.description}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{item.quantity.toString()} {item.unit}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{formatCurrency(moneyToCents(item.rate.toFixed(2)), currencyCode)}</td>
                  <td className="whitespace-nowrap py-3 pl-3 text-right">{formatCurrency(moneyToCents(item.amount.toFixed(2)), currencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Subtotal</dt><dd>{formatCurrency(moneyToCents(bill.subtotal.toFixed(2)), currencyCode)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Discount</dt><dd>{formatCurrency(moneyToCents(bill.discount.toFixed(2)), currencyCode)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Taxable amount</dt><dd>{formatCurrency(moneyToCents(bill.taxableAmount.toFixed(2)), currencyCode)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">VAT {bill.vatApplied ? `(${bill.vatRate.toFixed(2)}%)` : "(not applied)"}</dt><dd>{formatCurrency(moneyToCents(bill.vatAmount.toFixed(2)), currencyCode)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold text-primary"><dt>Grand total</dt><dd>{formatCurrency(moneyToCents(bill.totalAmount.toFixed(2)), currencyCode)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-secondary">Amount paid</dt><dd>{formatCurrency(moneyToCents(paid.toFixed(2)), currencyCode)}</dd></div>
            <div className="flex justify-between gap-4 font-semibold"><dt>Balance due</dt><dd>{formatCurrency(moneyToCents(outstanding.toFixed(2)), currencyCode)}</dd></div>
          </dl>
        </div>
        <p className="mt-4 text-sm italic text-text-secondary">{amountInWords(moneyToCents(bill.totalAmount.toFixed(2)))}</p>
        {bill.notes && (
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Notes</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{bill.notes}</p>
          </div>
        )}
        {company?.paymentInstructions && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Payment instructions</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{company.paymentInstructions}</p>
          </div>
        )}
        <div className="mt-16 flex justify-end">
          <div className="w-56 border-t border-text pt-2 text-center text-xs text-text-secondary">Authorized signature</div>
        </div>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-7 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Bill status</p>
            <h2 className="mt-1 text-lg font-semibold text-primary">{statusNames[displayStatus] ?? displayStatus}</h2>
          </div>
          <p className="text-sm text-text-secondary">Created by {bill.createdBy.name || bill.createdBy.email} · {formatDate(bill.createdAt)}</p>
        </div>

        {bill.status === BillStatus.CANCELLED && bill.cancellationReason && (
          <p className="mt-4 text-sm text-error">Cancellation reason: {bill.cancellationReason}</p>
        )}

        {bill.payments.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <h3 className="mb-2 font-semibold text-primary">Payments</h3>
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-text-secondary">
                <tr><th className="py-2 pr-3">Date</th><th className="px-3 py-2">Method</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2 text-right">Amount</th><th className="py-2 pl-3">Recorded by</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bill.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-2 pr-3">{formatDate(payment.paymentDate)}</td>
                    <td className="px-3 py-2">{payment.method.replaceAll("_", " ").toLowerCase()}</td>
                    <td className="px-3 py-2">{payment.reference || "—"}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(moneyToCents(payment.amount.toFixed(2)), currencyCode)}</td>
                    <td className="py-2 pl-3">{payment.receivedBy.name || payment.receivedBy.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {allowPayment && outstanding.greaterThan(0) && (
          <PaymentForm action={recordPayment.bind(null, bill.id)} today={new Date().toISOString().slice(0, 10)} />
        )}
        {allowCancel && <CancelBillForm action={cancelBill.bind(null, bill.id)} />}
      </section>
    </div>
  );
}
