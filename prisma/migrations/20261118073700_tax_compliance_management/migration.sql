CREATE TYPE "TaxFilingStatus" AS ENUM ('NOT_FILED', 'IN_PROGRESS', 'FILED');
CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE "ClientTaxRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "panNumber" VARCHAR(20),
    "vatRegistered" BOOLEAN NOT NULL,
    "vatNumber" VARCHAR(30),
    "taxPeriod" VARCHAR(100) NOT NULL,
    "taxType" VARCHAR(100) NOT NULL,
    "filingStatus" "TaxFilingStatus" NOT NULL DEFAULT 'NOT_FILED',
    "filingDate" DATE,
    "dueDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientTaxRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceTask" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "clientId" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "dueDate" DATE NOT NULL,
    "assignedToId" TEXT,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" DATE,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxRecordDocument" (
    "taxRecordId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaxRecordDocument_pkey" PRIMARY KEY ("taxRecordId", "documentId")
);

CREATE TABLE "ComplianceDocument" (
    "taskId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("taskId", "documentId")
);

CREATE UNIQUE INDEX "ClientTaxRecord_clientId_taxPeriod_taxType_key" ON "ClientTaxRecord"("clientId", "taxPeriod", "taxType");
CREATE INDEX "ClientTaxRecord_clientId_dueDate_idx" ON "ClientTaxRecord"("clientId", "dueDate");
CREATE INDEX "ClientTaxRecord_filingStatus_dueDate_idx" ON "ClientTaxRecord"("filingStatus", "dueDate");
CREATE INDEX "ClientTaxRecord_taxPeriod_taxType_idx" ON "ClientTaxRecord"("taxPeriod", "taxType");
CREATE INDEX "ComplianceTask_status_dueDate_idx" ON "ComplianceTask"("status", "dueDate");
CREATE INDEX "ComplianceTask_clientId_dueDate_idx" ON "ComplianceTask"("clientId", "dueDate");
CREATE INDEX "ComplianceTask_assignedToId_dueDate_idx" ON "ComplianceTask"("assignedToId", "dueDate");
CREATE INDEX "TaxRecordDocument_documentId_idx" ON "TaxRecordDocument"("documentId");
CREATE INDEX "ComplianceDocument_documentId_idx" ON "ComplianceDocument"("documentId");

ALTER TABLE "ClientTaxRecord" ADD CONSTRAINT "ClientTaxRecord_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxRecordDocument" ADD CONSTRAINT "TaxRecordDocument_taxRecordId_fkey"
FOREIGN KEY ("taxRecordId") REFERENCES "ClientTaxRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxRecordDocument" ADD CONSTRAINT "TaxRecordDocument_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "ComplianceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
