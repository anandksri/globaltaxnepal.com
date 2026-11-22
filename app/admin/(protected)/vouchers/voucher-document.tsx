import Image from "next/image";

export function VoucherDocument({
  title,
  voucherNumber,
  date,
  partyLabel,
  party,
  descriptionLabel,
  description,
  amount,
  method,
  reference,
  currencyCode,
  company,
}: {
  title: "Receipt Voucher" | "Payment Voucher";
  voucherNumber: string;
  date: Date;
  partyLabel: "Received from" | "Paid to";
  party: string;
  descriptionLabel: "Description" | "Purpose";
  description: string;
  amount: string;
  method: string;
  reference: string | null;
  currencyCode: string;
  company: {
    name: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    panNumber: string | null;
    vatNumber: string | null;
    logoStorageKey: string | null;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankBranch: string | null;
    paymentInstructions: string | null;
  } | null;
}) {
  return (
    <section className="invoice-print border border-border bg-surface p-5 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-xl font-semibold text-primary">{company?.name || "Global Tax Nepal"}</h2>
          <div className="mt-2 text-sm leading-6 text-text-secondary">
            {company?.address && <p>{company.address}</p>}
            {company?.phone && <p>{company.phone}</p>}
            {company?.email && <p>{company.email}</p>}
            {company?.website && <p>{company.website}</p>}
            {company?.panNumber && <p>PAN: {company.panNumber}</p>}
            {company?.vatNumber && <p>VAT: {company.vatNumber}</p>}
          </div>
        </div>
        <div className="text-right">
          <Image alt={company?.name || "Global Tax Nepal"} className="ml-auto h-auto w-52" height={68} priority src={company?.logoStorageKey ? "/admin/settings/logo" : "/assets/global-tax-nepal-logo.svg"} unoptimized={Boolean(company?.logoStorageKey)} width={390} />
          <h2 className="mt-5 text-2xl font-semibold uppercase tracking-wide text-primary">{title}</h2>
          <p className="mt-1 font-medium text-text">{voucherNumber}</p>
        </div>
      </header>
      <dl className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-text-secondary">{partyLabel}</dt>
          <dd className="mt-1 text-base font-semibold text-primary">{party}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-text-secondary">Voucher date</dt>
          <dd className="mt-1 text-sm text-text">{date.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" })}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-text-secondary">{descriptionLabel}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-text">{description}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-text-secondary">Payment method</dt>
          <dd className="mt-1 text-sm text-text">{method.replaceAll("_", " ").toLowerCase()}</dd>
        </div>
        {reference && (
          <div>
            <dt className="text-xs font-medium text-text-secondary">Reference</dt>
            <dd className="mt-1 text-sm text-text">{reference}</dd>
          </div>
        )}
      </dl>
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm border-t border-border pt-3">
          <p className="flex justify-between gap-4 text-lg font-semibold text-primary">
            <span>Amount</span><span>{currencyCode} {amount}</span>
          </p>
        </div>
      </div>
      <div className="mt-20 flex justify-end">
        <div className="w-56 border-t border-text pt-2 text-center text-xs text-text-secondary">Authorized signature</div>
      </div>
      {(company?.bankName || company?.bankAccountName || company?.bankAccountNumber || company?.bankBranch || company?.paymentInstructions) && (
        <div className="mt-8 border-t border-border pt-4 text-sm text-text-secondary">
          <h3 className="font-semibold text-primary">Payment information</h3>
          {[company.bankName, company.bankAccountName, company.bankAccountNumber, company.bankBranch, company.paymentInstructions].map((value, index) => value ? <p key={index}>{value}</p> : null)}
        </div>
      )}
    </section>
  );
}
