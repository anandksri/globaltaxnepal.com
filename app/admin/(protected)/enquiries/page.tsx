import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Website enquiries" };
export const dynamic = "force-dynamic";
const pageSize = 20;

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("DASHBOARD", "VIEW");
  const params = await searchParams;
  const rawPage = Number(params.page || "1");
  const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const total = await prisma.websiteEnquiry.count();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const enquiries = await prisma.websiteEnquiry.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true, name: true, whatsapp: true, email: true, subject: true,
      message: true, attachmentName: true, emailStatus: true, createdAt: true,
    },
  });

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">Enquiries submitted through the website, newest first. Times are shown in Nepal time.</p>
      {enquiries.length ? (
        <div className="space-y-4">
          {enquiries.map((enquiry) => (
            <article className="border border-border bg-surface p-5 sm:p-6" id={`enquiry-${enquiry.id}`} key={enquiry.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-primary">{enquiry.name}</h2>
                  <time className="mt-1 block text-xs text-text-secondary" dateTime={enquiry.createdAt.toISOString()}>
                    {enquiry.createdAt.toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" })}
                  </time>
                </div>
                <span className={`text-xs font-medium ${enquiry.emailStatus === "SENT" ? "text-success" : "text-error"}`}>
                  {enquiry.emailStatus === "SENT" ? "Email sent" : enquiry.emailStatus === "FAILED" ? "Email delivery failed" : "Email delivery not confirmed"}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-text-secondary">Mobile / WhatsApp</dt><dd className="mt-1 break-words text-text">{enquiry.whatsapp}</dd></div>
                <div><dt className="text-text-secondary">Email</dt><dd className="mt-1 break-words text-text">{enquiry.email || "Not provided"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-text-secondary">Subject / service</dt><dd className="mt-1 break-words text-text">{enquiry.subject || "Website enquiry"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-text-secondary">Message</dt><dd className="mt-1 whitespace-pre-wrap break-words text-text">{enquiry.message}</dd></div>
                {enquiry.attachmentName && (
                  <div className="sm:col-span-2">
                    <dt className="text-text-secondary">Attachment</dt>
                    <dd className="mt-1"><a className="break-all font-medium text-secondary hover:text-primary" href={`/admin/enquiries/${enquiry.id}/file`}>{enquiry.attachmentName}</a></dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
          <nav aria-label="Enquiry pages" className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
            <div className="flex items-center gap-3 text-sm">
              {page > 1 && <Link className="text-secondary hover:text-primary" href={`/admin/enquiries?page=${page - 1}`}>Previous</Link>}
              <span>Page {page} of {totalPages}</span>
              {page < totalPages && <Link className="text-secondary hover:text-primary" href={`/admin/enquiries?page=${page + 1}`}>Next</Link>}
            </div>
          </nav>
        </div>
      ) : (
        <p className="border border-border bg-surface px-5 py-8 text-sm text-text-secondary">No website enquiries have been received yet.</p>
      )}
    </div>
  );
}
