ALTER TYPE "AdminModule" ADD VALUE 'STUDENTS';

CREATE TYPE "StudentServiceType" AS ENUM (
    'STUDENT_ADMISSION',
    'PAN_REGISTRATION',
    'VAT_REGISTRATION',
    'COMPANY_REGISTRATION',
    'TAX_CLEARANCE',
    'ACCOUNTING_BOOKKEEPING',
    'OTHER'
);

CREATE TYPE "StudentApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

CREATE TABLE "StudentRegistration" (
    "id" TEXT NOT NULL,
    "studentName" VARCHAR(200) NOT NULL,
    "mobile" VARCHAR(40),
    "address" VARCHAR(500),
    "panCompanyName" VARCHAR(100),
    "inquiryReference" VARCHAR(200),
    "admissionBatch" VARCHAR(100),
    "serviceTypes" "StudentServiceType"[] NOT NULL DEFAULT ARRAY[]::"StudentServiceType"[],
    "otherService" VARCHAR(200),
    "courseName" VARCHAR(200),
    "workDescription" TEXT,
    "assignedToId" TEXT,
    "expectedCompletionDate" DATE,
    "totalAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "receivedAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "dueDate" DATE,
    "portalWebsite" VARCHAR(255),
    "portalUserId" VARCHAR(255),
    "portalPasswordEncrypted" TEXT,
    "receptionReceivedBy" VARCHAR(100),
    "receptionDate" DATE,
    "checkingVerifiedBy" VARCHAR(100),
    "checkingDate" DATE,
    "accountsCheckedBy" VARCHAR(100),
    "accountsCheckDate" DATE,
    "approvalStatus" "StudentApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" VARCHAR(100),
    "approvalDate" DATE,
    "remarks" TEXT,
    "discussionNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRegistration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentRegistration_studentName_idx" ON "StudentRegistration"("studentName");
CREATE INDEX "StudentRegistration_mobile_idx" ON "StudentRegistration"("mobile");
CREATE INDEX "StudentRegistration_approvalStatus_createdAt_idx"
    ON "StudentRegistration"("approvalStatus", "createdAt");
CREATE INDEX "StudentRegistration_assignedToId_idx"
    ON "StudentRegistration"("assignedToId");

ALTER TABLE "StudentRegistration"
ADD CONSTRAINT "StudentRegistration_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentRegistration"
ADD CONSTRAINT "StudentRegistration_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
