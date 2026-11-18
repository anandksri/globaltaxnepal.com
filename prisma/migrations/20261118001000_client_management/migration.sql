ALTER TABLE "Client"
ADD COLUMN "contactPerson" VARCHAR(200),
ADD COLUMN "province" VARCHAR(100),
ADD COLUMN "district" VARCHAR(100),
ADD COLUMN "municipality" VARCHAR(150),
ADD COLUMN "wardNumber" INTEGER,
ADD COLUMN "streetAddress" VARCHAR(500),
ADD COLUMN "panNumber" VARCHAR(20),
ADD COLUMN "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "vatNumber" VARCHAR(30),
ADD COLUMN "registrationDate" DATE,
ADD COLUMN "notes" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "Client_panNumber_key" ON "Client"("panNumber");
CREATE INDEX "Client_phone_idx" ON "Client"("phone");
CREATE INDEX "Client_isActive_createdAt_idx" ON "Client"("isActive", "createdAt");
