"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { encryptSensitiveText } from "@/lib/admin/sensitive-data";
import {
  getStudentRegistrationFormData,
  studentIdSchema,
  type StudentRegistrationFormData,
} from "@/lib/admin/students";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export type StudentActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function getFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

function amountToCents(amount: string) {
  const [whole, fraction = ""] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function validatePaymentAmounts(data: StudentRegistrationFormData) {
  return amountToCents(data.receivedAmount) <= amountToCents(data.totalAmount);
}

function getStudentData(data: StudentRegistrationFormData) {
  const toDate = (value: string | undefined) =>
    value ? new Date(`${value}T00:00:00.000Z`) : null;

  return {
    studentName: data.studentName,
    mobile: data.mobile ?? null,
    address: data.address ?? null,
    panCompanyName: data.panCompanyName ?? null,
    inquiryReference: data.inquiryReference ?? null,
    admissionBatch: data.admissionBatch ?? null,
    serviceTypes: data.serviceTypes,
    otherService: data.otherService ?? null,
    courseName: data.courseName ?? null,
    workDescription: data.workDescription ?? null,
    assignedToId: data.assignedToId ?? null,
    expectedCompletionDate: toDate(data.expectedCompletionDate),
    totalAmount: new Prisma.Decimal(data.totalAmount),
    receivedAmount: new Prisma.Decimal(data.receivedAmount),
    paymentMethod: data.paymentMethod ?? null,
    dueDate: toDate(data.dueDate),
    portalWebsite: data.portalWebsite ?? null,
    portalUserId: data.portalUserId ?? null,
    receptionReceivedBy: data.receptionReceivedBy ?? null,
    receptionDate: toDate(data.receptionDate),
    checkingVerifiedBy: data.checkingVerifiedBy ?? null,
    checkingDate: toDate(data.checkingDate),
    accountsCheckedBy: data.accountsCheckedBy ?? null,
    accountsCheckDate: toDate(data.accountsCheckDate),
    approvalStatus: data.approvalStatus,
    approvedBy: data.approvedBy ?? null,
    approvalDate: toDate(data.approvalDate),
    remarks: data.remarks ?? null,
    discussionNotes: data.discussionNotes ?? null,
  };
}

export async function createStudent(
  _previousState: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const admin = await requirePermission("STUDENTS", "CREATE");
  const parsed = getStudentRegistrationFormData(formData);
  if (!parsed.success) {
    return {
      error: "Review the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsed.error.issues),
    };
  }
  if (!validatePaymentAmounts(parsed.data)) {
    return {
      error: "Received amount cannot be greater than the total amount.",
      fieldErrors: {
        receivedAmount: "Received amount cannot be greater than the total amount.",
      },
    };
  }

  let studentId: string;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      if (parsed.data.assignedToId) {
        const assignee = await transaction.user.findFirst({
          where: { id: parsed.data.assignedToId, isActive: true },
          select: { id: true },
        });
        if (!assignee) return { kind: "invalid-assignee" as const };
      }

      const student = await transaction.studentRegistration.create({
        data: {
          ...getStudentData(parsed.data),
          portalPasswordEncrypted: encryptSensitiveText(
            parsed.data.portalPassword ?? "",
          ),
          createdById: admin.id,
        },
        select: { id: true },
      });

      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "STUDENT_CREATED",
          targetType: "StudentRegistration",
          targetId: student.id,
          metadata: { studentName: parsed.data.studentName },
        },
      });

      return { kind: "created" as const, id: student.id };
    });

    if (result.kind === "invalid-assignee") {
      return {
        error: "Choose an active staff member for this assignment.",
        fieldErrors: { assignedToId: "The selected staff member is unavailable." },
      };
    }
    studentId = result.id;
  } catch (error) {
    console.error("[admin-students] Student registration failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The student record could not be saved. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/students");
  redirect(`/admin/students/${studentId}`);
}

export async function updateStudent(
  studentId: string,
  _previousState: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const admin = await requirePermission("STUDENTS", "EDIT");
  const validId = studentIdSchema.safeParse(studentId);
  if (!validId.success) {
    return { error: "This student record could not be found." };
  }

  const parsed = getStudentRegistrationFormData(formData);
  if (!parsed.success) {
    return {
      error: "Review the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsed.error.issues),
    };
  }
  if (!validatePaymentAmounts(parsed.data)) {
    return {
      error: "Received amount cannot be greater than the total amount.",
      fieldErrors: {
        receivedAmount: "Received amount cannot be greater than the total amount.",
      },
    };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.studentRegistration.findUnique({
        where: { id: validId.data },
        select: { id: true, assignedToId: true },
      });
      if (!current) return "missing" as const;

      if (
        parsed.data.assignedToId &&
        parsed.data.assignedToId !== current.assignedToId
      ) {
        const assignee = await transaction.user.findFirst({
          where: { id: parsed.data.assignedToId, isActive: true },
          select: { id: true },
        });
        if (!assignee) return "invalid-assignee" as const;
      }

      await transaction.studentRegistration.update({
        where: { id: validId.data },
        data: {
          ...getStudentData(parsed.data),
          ...(parsed.data.portalPassword
            ? {
                portalPasswordEncrypted:
                  encryptSensitiveText(parsed.data.portalPassword) ?? undefined,
              }
            : {}),
        },
      });
      await transaction.activityLog.create({
        data: {
          actorId: admin.id,
          action: "STUDENT_UPDATED",
          targetType: "StudentRegistration",
          targetId: validId.data,
          metadata: { studentName: parsed.data.studentName },
        },
      });
      return "updated" as const;
    });

    if (result === "missing") {
      return { error: "This student record could not be found." };
    }
    if (result === "invalid-assignee") {
      return {
        error: "Choose an active staff member for this assignment.",
        fieldErrors: { assignedToId: "The selected staff member is unavailable." },
      };
    }
  } catch (error) {
    console.error("[admin-students] Student update failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "The student record could not be updated. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${validId.data}`);
  redirect(`/admin/students/${validId.data}`);
}
