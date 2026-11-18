CREATE TYPE "AccountCategoryType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "AccountRecordType" AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE "AccountNumberSequence" (
    "type" "AccountRecordType" NOT NULL,
    "year" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountNumberSequence_pkey" PRIMARY KEY ("type", "year")
);

CREATE TABLE "AccountCategory" (
    "id" TEXT NOT NULL,
    "type" "AccountCategoryType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountCategory_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AccountCategory" ("id", "type", "name", "isSystem", "updatedAt") VALUES
    ('system-income-bill-payments', 'INCOME', 'Bill payments', true, CURRENT_TIMESTAMP),
    ('system-income-client-receipts', 'INCOME', 'Client receipts', true, CURRENT_TIMESTAMP),
    ('system-expense-payment-vouchers', 'EXPENSE', 'Payment vouchers', true, CURRENT_TIMESTAMP);

CREATE TABLE "IncomeRecord" (
    "id" TEXT NOT NULL,
    "referenceNumber" VARCHAR(40) NOT NULL,
    "incomeDate" DATE NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'NPR',
    "method" "PaymentMethod" NOT NULL,
    "clientId" TEXT,
    "clientName" VARCHAR(200),
    "reference" VARCHAR(100),
    "sourcePaymentId" TEXT,
    "sourceReceiptVoucherId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IncomeRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpenseRecord" (
    "id" TEXT NOT NULL,
    "referenceNumber" VARCHAR(40) NOT NULL,
    "expenseDate" DATE NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'NPR',
    "method" "PaymentMethod" NOT NULL,
    "paidTo" VARCHAR(200) NOT NULL,
    "reference" VARCHAR(100),
    "sourcePaymentVoucherId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpenseRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountCategory_type_name_key" ON "AccountCategory"("type", "name");
CREATE INDEX "AccountCategory_type_name_idx" ON "AccountCategory"("type", "name");
CREATE UNIQUE INDEX "IncomeRecord_referenceNumber_key" ON "IncomeRecord"("referenceNumber");
CREATE UNIQUE INDEX "IncomeRecord_sourcePaymentId_key" ON "IncomeRecord"("sourcePaymentId");
CREATE UNIQUE INDEX "IncomeRecord_sourceReceiptVoucherId_key" ON "IncomeRecord"("sourceReceiptVoucherId");
CREATE INDEX "IncomeRecord_incomeDate_createdAt_idx" ON "IncomeRecord"("incomeDate", "createdAt");
CREATE INDEX "IncomeRecord_categoryId_incomeDate_idx" ON "IncomeRecord"("categoryId", "incomeDate");
CREATE INDEX "IncomeRecord_clientId_incomeDate_idx" ON "IncomeRecord"("clientId", "incomeDate");
CREATE UNIQUE INDEX "ExpenseRecord_referenceNumber_key" ON "ExpenseRecord"("referenceNumber");
CREATE UNIQUE INDEX "ExpenseRecord_sourcePaymentVoucherId_key" ON "ExpenseRecord"("sourcePaymentVoucherId");
CREATE INDEX "ExpenseRecord_expenseDate_createdAt_idx" ON "ExpenseRecord"("expenseDate", "createdAt");
CREATE INDEX "ExpenseRecord_categoryId_expenseDate_idx" ON "ExpenseRecord"("categoryId", "expenseDate");
CREATE INDEX "ExpenseRecord_paidTo_idx" ON "ExpenseRecord"("paidTo");

ALTER TABLE "IncomeRecord" ADD CONSTRAINT "IncomeRecord_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "AccountCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncomeRecord" ADD CONSTRAINT "IncomeRecord_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncomeRecord" ADD CONSTRAINT "IncomeRecord_sourcePaymentId_fkey"
FOREIGN KEY ("sourcePaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncomeRecord" ADD CONSTRAINT "IncomeRecord_sourceReceiptVoucherId_fkey"
FOREIGN KEY ("sourceReceiptVoucherId") REFERENCES "ReceiptVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncomeRecord" ADD CONSTRAINT "IncomeRecord_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "AccountCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_sourcePaymentVoucherId_fkey"
FOREIGN KEY ("sourcePaymentVoucherId") REFERENCES "PaymentVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
