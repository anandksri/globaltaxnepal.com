import type { Metadata } from "next";
import { AdminModule, PermissionAction } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceLabel, getStudentRegistrationNumber, studentIdSchema } from "@/lib/admin/students";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Student details" };
export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0 border-b border-border py-3">
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words text-sm text-text">{value || "—"}</dd>
    </div>
  );
}

function formatDate(value: Date | null) {
  return value?.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" }) ?? "—";
}

export default async function StudentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission(AdminModule.STUDENTS, PermissionAction.VIEW);
  const { id } = await params;
  const validId = studentIdSchema.safeParse(id);
  if (!validId.success) notFound();

  const student = await prisma.studentRegistration.findUnique({
    where: { id: validId.data },
    include: {
      assignedTo: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!student) notFound();
  const canEdit =
    admin.roleName === "SUPER_ADMIN" ||
    admin.permissions.some(
      (permission) =>
        permission.module === AdminModule.STUDENTS &&
        permission.action === PermissionAction.EDIT,
    );
  const dueAmount = student.totalAmount.sub(student.receivedAmount);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/students">
          ← Student details
        </Link>
        {canEdit && (
          <Link className="button button-secondary" href={`/admin/students/${student.id}/edit`}>
            Edit registration
          </Link>
        )}
      </div>

      <section className="border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
              {getStudentRegistrationNumber(student.id)}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-primary sm:text-2xl">
              {student.studentName}
            </h2>
          </div>
          <span className="border border-border px-3 py-1 text-sm font-medium text-primary">
            {student.approvalStatus.toLowerCase()}
          </span>
        </div>
        <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Mobile number" value={student.mobile} />
          <Detail label="Address" value={student.address} />
          <Detail label="PAN / Company name" value={student.panCompanyName} />
          <Detail label="Inquiry / Reference" value={student.inquiryReference} />
          <Detail label="Admission batch" value={student.admissionBatch} />
          <Detail label="Course name" value={student.courseName} />
          <Detail label="Assigned staff" value={student.assignedTo?.name || student.assignedTo?.email} />
          <Detail label="Expected completion" value={formatDate(student.expectedCompletionDate)} />
          <Detail label="Registered by" value={student.createdBy.name || student.createdBy.email} />
          <Detail label="Created" value={formatDate(student.createdAt)} />
        </dl>
        <div className="mt-5">
          <h3 className="text-xs font-medium text-text-secondary">Services</h3>
          <p className="mt-1 text-sm text-text">
            {student.serviceTypes.map(getServiceLabel).join(", ") || "No services selected"}
            {student.otherService ? ` · ${student.otherService}` : ""}
          </p>
        </div>
        <div className="mt-5">
          <h3 className="text-xs font-medium text-text-secondary">Work description / course details</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text">{student.workDescription || "—"}</p>
        </div>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-7">
        <h2 className="border-b border-border pb-3 font-semibold text-primary">Payment details</h2>
        <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Total amount (NPR)" value={student.totalAmount.toFixed(2)} />
          <Detail label="Received amount (NPR)" value={student.receivedAmount.toFixed(2)} />
          <Detail label="Due amount (NPR)" value={dueAmount.toFixed(2)} />
          <Detail label="Payment method" value={student.paymentMethod?.replaceAll("_", " ")} />
          <Detail label="Due date" value={formatDate(student.dueDate)} />
        </dl>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-7">
        <h2 className="border-b border-border pb-3 font-semibold text-primary">Portal / login information</h2>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <Detail label="Portal / website" value={student.portalWebsite} />
          <Detail label="User ID / reference" value={student.portalUserId} />
          <Detail label="Portal password" value={student.portalPasswordEncrypted ? "Saved securely (hidden)" : "Not provided"} />
        </dl>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-7">
        <h2 className="border-b border-border pb-3 font-semibold text-primary">Verification &amp; approval</h2>
        <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Reception received by" value={student.receptionReceivedBy} />
          <Detail label="Reception date" value={formatDate(student.receptionDate)} />
          <Detail label="Checking verified by" value={student.checkingVerifiedBy} />
          <Detail label="Checking date" value={formatDate(student.checkingDate)} />
          <Detail label="Accounts checked by" value={student.accountsCheckedBy} />
          <Detail label="Accounts check date" value={formatDate(student.accountsCheckDate)} />
          <Detail label="Approval status" value={student.approvalStatus.toLowerCase()} />
          <Detail label="Approved by" value={student.approvedBy} />
          <Detail label="Approval date" value={formatDate(student.approvalDate)} />
        </dl>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium text-text-secondary">Remarks</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text">{student.remarks || "—"}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-text-secondary">Discussion / key notes</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text">{student.discussionNotes || "—"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
