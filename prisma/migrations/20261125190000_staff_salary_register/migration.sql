CREATE TABLE "ManualSalaryStaff" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "phone" VARCHAR(40),
  "email" VARCHAR(254),
  "address" VARCHAR(500),
  "designation" VARCHAR(150),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualSalaryStaff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffSalaryYear" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "manualStaffId" TEXT,
  "year" INTEGER NOT NULL,
  "amounts" JSONB NOT NULL,
  "remarks" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffSalaryYear_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffSalaryYear_one_staff_check" CHECK (("userId" IS NOT NULL) <> ("manualStaffId" IS NOT NULL)),
  CONSTRAINT "StaffSalaryYear_year_check" CHECK ("year" BETWEEN 2000 AND 9999)
);

CREATE UNIQUE INDEX "StaffSalaryYear_userId_year_key" ON "StaffSalaryYear"("userId", "year");
CREATE UNIQUE INDEX "StaffSalaryYear_manualStaffId_year_key" ON "StaffSalaryYear"("manualStaffId", "year");
ALTER TABLE "StaffSalaryYear" ADD CONSTRAINT "StaffSalaryYear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "StaffSalaryYear" ADD CONSTRAINT "StaffSalaryYear_manualStaffId_fkey" FOREIGN KEY ("manualStaffId") REFERENCES "ManualSalaryStaff"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
