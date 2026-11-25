import type { Metadata } from "next";
import Link from "next/link";
import { createStudent } from "../actions";
import { StudentForm, type StudentFormValues } from "../student-form";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Register student" };
export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await requirePermission("STUDENTS", "CREATE");
  const staff = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true },
  });
  const initialValues: StudentFormValues = {
    studentName: "",
    mobile: "",
    address: "",
    panCompanyName: "",
    inquiryReference: "",
    admissionBatch: "",
    serviceTypes: [],
    otherService: "",
    courseName: "",
    workDescription: "",
    assignedToId: "",
    expectedCompletionDate: "",
    totalAmount: "0",
    receivedAmount: "0",
    paymentMethod: "",
    dueDate: "",
    portalWebsite: "",
    portalUserId: "",
    receptionReceivedBy: "",
    receptionDate: "",
    checkingVerifiedBy: "",
    checkingDate: "",
    accountsCheckedBy: "",
    accountsCheckDate: "",
    approvalStatus: "PENDING",
    approvedBy: "",
    approvalDate: "",
    remarks: "",
    discussionNotes: "",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link className="text-sm font-medium text-secondary hover:text-primary" href="/admin/students">
        ← Student details
      </Link>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <StudentForm
          action={createStudent}
          initialValues={initialValues}
          staff={staff}
          submitLabel="Register student"
        />
      </section>
    </div>
  );
}
