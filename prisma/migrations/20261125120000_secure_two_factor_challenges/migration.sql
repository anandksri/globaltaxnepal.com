CREATE TABLE "AdminTwoFactorChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminTwoFactorChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminTwoFactorChallenge_userId_key"
ON "AdminTwoFactorChallenge"("userId");

CREATE INDEX "AdminTwoFactorChallenge_expiresAt_idx"
ON "AdminTwoFactorChallenge"("expiresAt");

ALTER TABLE "AdminTwoFactorChallenge"
ADD CONSTRAINT "AdminTwoFactorChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
