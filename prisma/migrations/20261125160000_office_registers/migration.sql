CREATE TABLE "OfficeRegister" (
  "id" TEXT NOT NULL,
  "kind" VARCHAR(40) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "clientId" TEXT,
  "data" JSONB NOT NULL,
  "reportDate" DATE,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfficeRegister_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfficeRegister_kind_createdAt_idx" ON "OfficeRegister"("kind", "createdAt");
CREATE INDEX "OfficeRegister_clientId_idx" ON "OfficeRegister"("clientId");
CREATE INDEX "OfficeRegister_kind_reportDate_idx" ON "OfficeRegister"("kind", "reportDate");
ALTER TABLE "OfficeRegister" ADD CONSTRAINT "OfficeRegister_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfficeRegister" ADD CONSTRAINT "OfficeRegister_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OfficeRegisterStaff" (
  "registerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  PRIMARY KEY ("registerId", "userId"),
  FOREIGN KEY ("registerId") REFERENCES "OfficeRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE TABLE "OfficeRegisterTask" (
  "registerId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  PRIMARY KEY ("registerId", "taskId"),
  FOREIGN KEY ("registerId") REFERENCES "OfficeRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("taskId") REFERENCES "ComplianceTask"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE TABLE "OfficeRegisterDocument" (
  "registerId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  PRIMARY KEY ("registerId", "documentId"),
  FOREIGN KEY ("registerId") REFERENCES "OfficeRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE INDEX "OfficeRegisterStaff_userId_idx" ON "OfficeRegisterStaff"("userId");
CREATE INDEX "OfficeRegisterTask_taskId_idx" ON "OfficeRegisterTask"("taskId");
CREATE INDEX "OfficeRegisterDocument_documentId_idx" ON "OfficeRegisterDocument"("documentId");
