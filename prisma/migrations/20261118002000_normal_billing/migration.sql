CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET', 'OTHER');

ALTER TABLE "CompanySettings"
ADD COLUMN "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'NPR',
ADD COLUMN "invoicePrefix" VARCHAR(12),
ADD COLUMN "paymentInstructions" TEXT;

CREATE TABLE "BillNumberSequence" (
    "year" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillNumberSequence_pkey" PRIMARY KEY ("year")
);

CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "billNumber" VARCHAR(40) NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" VARCHAR(200) NOT NULL,
    "contactPerson" VARCHAR(200),
    "clientEmail" VARCHAR(254),
    "clientPhone" VARCHAR(40),
    "clientAddress" VARCHAR(1000),
    "clientPanNumber" VARCHAR(20),
    "clientVatNumber" VARCHAR(30),
    "billDate" DATE NOT NULL,
    "dueDate" DATE,
    "status" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'NPR',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(14,2) NOT NULL,
    "vatApplied" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillItem" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "rate" DECIMAL(14,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reference" VARCHAR(100),
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Bill_billNumber_key" ON "Bill"("billNumber");
CREATE INDEX "Bill_clientId_createdAt_idx" ON "Bill"("clientId", "createdAt");
CREATE INDEX "Bill_status_billDate_idx" ON "Bill"("status", "billDate");
CREATE INDEX "Bill_billDate_idx" ON "Bill"("billDate");
CREATE INDEX "Bill_dueDate_status_idx" ON "Bill"("dueDate", "status");
CREATE INDEX "Bill_clientName_idx" ON "Bill"("clientName");
CREATE UNIQUE INDEX "BillItem_billId_position_key" ON "BillItem"("billId", "position");
CREATE INDEX "BillItem_billId_idx" ON "BillItem"("billId");
CREATE INDEX "Payment_billId_paymentDate_idx" ON "Payment"("billId", "paymentDate");
CREATE INDEX "Payment_receivedById_createdAt_idx" ON "Payment"("receivedById", "createdAt");

ALTER TABLE "Bill" ADD CONSTRAINT "Bill_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey"
FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billId_fkey"
FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey"
FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
