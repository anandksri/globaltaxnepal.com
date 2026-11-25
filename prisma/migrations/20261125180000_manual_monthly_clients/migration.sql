CREATE TABLE "ManualMonthlyClient" (
  "id" TEXT NOT NULL,
  "displayName" VARCHAR(200) NOT NULL,
  "phone" VARCHAR(40),
  "panNumber" VARCHAR(20),
  "dates" JSONB NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualMonthlyClient_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ManualMonthlyClient_displayName_id_idx" ON "ManualMonthlyClient"("displayName", "id");
CREATE TABLE "ManualMonthlyDocument" (
  "manualClientId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  CONSTRAINT "ManualMonthlyDocument_pkey" PRIMARY KEY ("manualClientId", "documentId"),
  CONSTRAINT "ManualMonthlyDocument_manualClientId_fkey" FOREIGN KEY ("manualClientId") REFERENCES "ManualMonthlyClient"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ManualMonthlyDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE INDEX "ManualMonthlyDocument_documentId_idx" ON "ManualMonthlyDocument"("documentId");
