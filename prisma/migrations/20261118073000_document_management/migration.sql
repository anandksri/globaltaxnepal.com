CREATE TYPE "DocumentCategory" AS ENUM (
    'PAN_CERTIFICATE',
    'VAT_CERTIFICATE',
    'COMPANY_REGISTRATION',
    'TAX_CLEARANCE',
    'CLIENT_IDENTIFICATION',
    'BILL_INVOICE',
    'RECEIPT_VOUCHER',
    'PAYMENT_VOUCHER',
    'AGREEMENT',
    'SUPPORTING_DOCUMENT',
    'OTHER'
);

CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "description" VARCHAR(1000),
    "clientId" TEXT,
    "originalName" VARCHAR(255) NOT NULL,
    "storageKey" VARCHAR(100) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");
CREATE INDEX "Document_category_createdAt_idx" ON "Document"("category", "createdAt");
CREATE INDEX "Document_clientId_createdAt_idx" ON "Document"("clientId", "createdAt");
CREATE INDEX "Document_title_idx" ON "Document"("title");
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
