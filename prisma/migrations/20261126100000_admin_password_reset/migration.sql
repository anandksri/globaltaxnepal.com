ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AdminPasswordReset" (
    "userId" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "credentialHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminPasswordReset_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "AdminPasswordReset_tokenHash_key" ON "AdminPasswordReset"("tokenHash");
CREATE INDEX "AdminPasswordReset_expiresAt_idx" ON "AdminPasswordReset"("expiresAt");
ALTER TABLE "AdminPasswordReset" ADD CONSTRAINT "AdminPasswordReset_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
