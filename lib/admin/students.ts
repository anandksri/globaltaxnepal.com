import {
  PaymentMethod,
  StudentApprovalStatus,
  StudentServiceType,
} from "@prisma/client";
import { z } from "zod";

export const studentIdSchema = z.string().regex(/^c[a-z0-9]{24}$/i);

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      value == null || (typeof value === "string" && value.trim() === "")
        ? undefined
        : value,
    z.string().trim().max(max).optional(),
  );

const optionalDate = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? undefined
      : value,
  z.iso.date().optional(),
);

const moneyAmount = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? "0" : value,
  z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Enter a valid amount."),
);

export const studentRegistrationSchema = z.object({
  studentName: z.string().trim().min(1, "Enter the student name.").max(200),
  mobile: optionalText(40),
  address: optionalText(500),
  panCompanyName: optionalText(100),
  inquiryReference: optionalText(200),
  admissionBatch: optionalText(100),
  serviceTypes: z
    .array(z.nativeEnum(StudentServiceType))
    .max(Object.values(StudentServiceType).length)
    .transform((values) => [...new Set(values)]),
  otherService: optionalText(200),
  courseName: optionalText(200),
  workDescription: optionalText(5000),
  assignedToId: optionalText(191),
  expectedCompletionDate: optionalDate,
  totalAmount: moneyAmount,
  receivedAmount: moneyAmount,
  paymentMethod: z.preprocess(
    (value) =>
      value == null || (typeof value === "string" && value.trim() === "")
        ? undefined
        : value,
    z.nativeEnum(PaymentMethod).optional(),
  ),
  dueDate: optionalDate,
  portalWebsite: optionalText(255),
  portalUserId: optionalText(255),
  portalPassword: optionalText(1000),
  receptionReceivedBy: optionalText(100),
  receptionDate: optionalDate,
  checkingVerifiedBy: optionalText(100),
  checkingDate: optionalDate,
  accountsCheckedBy: optionalText(100),
  accountsCheckDate: optionalDate,
  approvalStatus: z.nativeEnum(StudentApprovalStatus),
  approvedBy: optionalText(100),
  approvalDate: optionalDate,
  remarks: optionalText(2000),
  discussionNotes: optionalText(5000),
});

export type StudentRegistrationFormData = z.infer<
  typeof studentRegistrationSchema
>;

export function getStudentRegistrationFormData(formData: FormData) {
  return studentRegistrationSchema.safeParse({
    studentName: formData.get("studentName"),
    mobile: formData.get("mobile"),
    address: formData.get("address"),
    panCompanyName: formData.get("panCompanyName"),
    inquiryReference: formData.get("inquiryReference"),
    admissionBatch: formData.get("admissionBatch"),
    serviceTypes: formData.getAll("serviceTypes"),
    otherService: formData.get("otherService"),
    courseName: formData.get("courseName"),
    workDescription: formData.get("workDescription"),
    assignedToId: formData.get("assignedToId"),
    expectedCompletionDate: formData.get("expectedCompletionDate"),
    totalAmount: formData.get("totalAmount"),
    receivedAmount: formData.get("receivedAmount"),
    paymentMethod: formData.get("paymentMethod"),
    dueDate: formData.get("dueDate"),
    portalWebsite: formData.get("portalWebsite"),
    portalUserId: formData.get("portalUserId"),
    portalPassword: formData.get("portalPassword"),
    receptionReceivedBy: formData.get("receptionReceivedBy"),
    receptionDate: formData.get("receptionDate"),
    checkingVerifiedBy: formData.get("checkingVerifiedBy"),
    checkingDate: formData.get("checkingDate"),
    accountsCheckedBy: formData.get("accountsCheckedBy"),
    accountsCheckDate: formData.get("accountsCheckDate"),
    approvalStatus: formData.get("approvalStatus"),
    approvedBy: formData.get("approvedBy"),
    approvalDate: formData.get("approvalDate"),
    remarks: formData.get("remarks"),
    discussionNotes: formData.get("discussionNotes"),
  });
}

export function getStudentRegistrationNumber(id: string) {
  return `ST-${id.toUpperCase()}`;
}

export function getServiceLabel(service: StudentServiceType) {
  const labels: Record<StudentServiceType, string> = {
    STUDENT_ADMISSION: "Student admission",
    PAN_REGISTRATION: "PAN registration",
    VAT_REGISTRATION: "VAT registration",
    COMPANY_REGISTRATION: "Company registration",
    TAX_CLEARANCE: "Tax clearance",
    ACCOUNTING_BOOKKEEPING: "Accounting / bookkeeping",
    OTHER: "Other",
  };
  return labels[service];
}
