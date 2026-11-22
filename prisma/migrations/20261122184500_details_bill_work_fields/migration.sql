ALTER TABLE "Bill"
  ADD COLUMN "workDescription" TEXT,
  ADD COLUMN "accountPassword" TEXT,
  ADD COLUMN "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
