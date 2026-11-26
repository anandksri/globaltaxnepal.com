CREATE TYPE "EnquiryEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "WebsiteEnquiry" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "whatsapp" VARCHAR(30) NOT NULL,
    "email" VARCHAR(254),
    "subject" VARCHAR(200),
    "message" TEXT NOT NULL,
    "attachmentName" VARCHAR(255),
    "attachmentType" VARCHAR(255),
    "attachmentData" BYTEA,
    "emailStatus" "EnquiryEmailStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteEnquiry_createdAt_id_idx" ON "WebsiteEnquiry"("createdAt", "id");
