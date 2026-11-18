CREATE TYPE "BillType" AS ENUM ('NORMAL', 'DETAILS');
CREATE TYPE "VoucherType" AS ENUM ('RECEIPT', 'PAYMENT');

ALTER TABLE "Bill"
ADD COLUMN "billType" "BillType" NOT NULL DEFAULT 'NORMAL';

CREATE INDEX "Bill_billType_billDate_idx" ON "Bill"("billType", "billDate");

CREATE TABLE "VoucherNumberSequence" (
    "type" "VoucherType" NOT NULL,
    "year" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VoucherNumberSequence_pkey" PRIMARY KEY ("type", "year")
);

CREATE TABLE "ReceiptVoucher" (
    "id" TEXT NOT NULL,
    "voucherNumber" VARCHAR(40) NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" VARCHAR(200) NOT NULL,
    "voucherDate" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'NPR',
    "method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(100),
    "description" VARCHAR(1000) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReceiptVoucher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentVoucher" (
    "id" TEXT NOT NULL,
    "voucherNumber" VARCHAR(40) NOT NULL,
    "voucherDate" DATE NOT NULL,
    "payeeName" VARCHAR(200) NOT NULL,
    "purpose" VARCHAR(1000) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'NPR',
    "method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(100),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceiptVoucher_voucherNumber_key" ON "ReceiptVoucher"("voucherNumber");
CREATE INDEX "ReceiptVoucher_clientId_voucherDate_idx" ON "ReceiptVoucher"("clientId", "voucherDate");
CREATE INDEX "ReceiptVoucher_voucherDate_idx" ON "ReceiptVoucher"("voucherDate");
CREATE UNIQUE INDEX "PaymentVoucher_voucherNumber_key" ON "PaymentVoucher"("voucherNumber");
CREATE INDEX "PaymentVoucher_voucherDate_idx" ON "PaymentVoucher"("voucherDate");
CREATE INDEX "PaymentVoucher_payeeName_idx" ON "PaymentVoucher"("payeeName");

ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
