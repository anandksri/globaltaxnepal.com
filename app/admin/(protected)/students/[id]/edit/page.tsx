import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateStudent } from "../../actions";
import { StudentForm, type StudentFormValues } from "../../student-form";
import { studentIdSchema } from "@/lib/admin/students";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit student registration" };
export const dynamic = "force-dynamic";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("STUDENTS", "EDIT");
  const { id } = await params;
  const validId = studentIdSchema.safeParse(id);
  if (!validId.success) notFound();

  const student = await prisma.studentRegistration.findUnique({
    where: { id: validId.data },
  });
  if (!student) notFound();
  const staff = await prisma.user.findMany({
    where: {
      OR: [
        { isActive: true },
        ...(student.assignedToId ? [{ id: student.assignedToId }] : []),
      ],
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true },
  });

  const initialValues: StudentFormValues = {
    studentName: student.studentName,
    mobile: student.mobile ?? "",
    address: student.address ?? "",
    panCompanyName: student.panCompanyName ?? "",
    inquiryReference: student.inquiryReference ?? "",
    admissionBatch: student.admissionBatch ?? "",
    serviceTypes: student.serviceTypes,
    otherService: student.otherService ?? "",
    courseName: student.courseName ?? "",
    workDescription: student.workDescription ?? "",
    assignedToId: student.assignedToId ?? "",
    expectedCompletionDate: student.expectedCompletionDate?.toISOString().slice(0, 10) ?? "",
    totalAmount: student.totalAmount.toFixed(2),
    receivedAmount: student.receivedAmount.toFixed(2),
    paymentMethod: student.paymentMethod ?? "",
    dueDate: student.dueDate?.toISOString().slice(0, 10) ?? "",
    portalWebsite: student.portalWebsite ?? "",
    portalUserId: student.portalUserId ?? "",
    receptionReceivedBy: student.receptionReceivedBy ?? "",
    receptionDate: student.receptionDate?.toISOString().slice(0, 10) ?? "",
    checkingVerifiedBy: student.checkingVerifiedBy ?? "",
    checkingDate: student.checkingDate?.toISOString().slice(0, 10) ?? "",
    accountsCheckedBy: student.accountsCheckedBy ?? "",
    accountsCheckDate: student.accountsCheckDate?.toISOString().slice(0, 10) ?? "",
    approvalStatus: student.approvalStatus,
    approvedBy: student.approvedBy ?? "",
    approvalDate: student.approvalDate?.toISOString().slice(0, 10) ?? "",
    remarks: student.remarks ?? "",
    discussionNotes: student.discussionNotes ?? "",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/students/${student.id}`}>
        ← Student details
      </Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <StudentForm
          action={updateStudent.bind(null, student.id)}
          initialValues={initialValues}
          staff={staff}
          submitLabel="Save changes"
        />
      </section>
    </div>
  );
}
