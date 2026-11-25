CREATE TABLE "ClientMonthlyData" (
  "clientId" TEXT NOT NULL,
  "dates" JSONB NOT NULL,
  "remarks" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientMonthlyData_pkey" PRIMARY KEY ("clientId"),
  CONSTRAINT "ClientMonthlyData_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ClientMonthlyDocument" (
  "clientId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  CONSTRAINT "ClientMonthlyDocument_pkey" PRIMARY KEY ("clientId", "documentId"),
  CONSTRAINT "ClientMonthlyDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientMonthlyData"("clientId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientMonthlyDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE INDEX "ClientMonthlyDocument_documentId_idx" ON "ClientMonthlyDocument"("documentId");
