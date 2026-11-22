CREATE TYPE "AdminModule" AS ENUM (
    'DASHBOARD', 'CLIENTS', 'BILLING', 'VOUCHERS', 'ACCOUNTS',
    'DOCUMENTS', 'TAX', 'REPORTS', 'SETTINGS', 'STAFF_MANAGEMENT'
);
CREATE TYPE "PermissionAction" AS ENUM ('VIEW', 'CREATE', 'EDIT', 'DELETE');

ALTER TABLE "User" ADD COLUMN "phone" VARCHAR(40);
ALTER TABLE "CompanySettings"
    ADD COLUMN "panNumber" VARCHAR(20),
    ADD COLUMN "vatNumber" VARCHAR(30),
    ADD COLUMN "receiptVoucherPrefix" VARCHAR(12),
    ADD COLUMN "paymentVoucherPrefix" VARCHAR(12),
    ADD COLUMN "bankName" VARCHAR(150),
    ADD COLUMN "bankAccountName" VARCHAR(200),
    ADD COLUMN "bankAccountNumber" VARCHAR(100),
    ADD COLUMN "bankBranch" VARCHAR(150),
    ADD COLUMN "logoStorageKey" VARCHAR(100),
    ADD COLUMN "logoMimeType" VARCHAR(100),
    ADD COLUMN "logoOriginalName" VARCHAR(255);

CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "module" "AdminModule" NOT NULL,
    "action" "PermissionAction" NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "module", "action")
);

CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanySettings_logoStorageKey_key" ON "CompanySettings"("logoStorageKey");
CREATE INDEX "RolePermission_module_action_idx" ON "RolePermission"("module", "action");
CREATE UNIQUE INDEX "UserInvitation_tokenHash_key" ON "UserInvitation"("tokenHash");
CREATE INDEX "UserInvitation_userId_expiresAt_idx" ON "UserInvitation"("userId", "expiresAt");
CREATE INDEX "UserInvitation_expiresAt_usedAt_idx" ON "UserInvitation"("expiresAt", "usedAt");

ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Role" ("id", "name", "description", "createdAt", "updatedAt")
VALUES
    ('role_super_admin', 'SUPER_ADMIN', 'Full access to all modules and role permissions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_admin', 'ADMIN', 'Business administration access.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_accountant', 'ACCOUNTANT', 'Billing, vouchers, accounts, and reports.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_staff', 'STAFF', 'Limited operational access.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

UPDATE "User"
SET "roleId" = (SELECT "id" FROM "Role" WHERE "name" = 'SUPER_ADMIN')
WHERE "roleId" IN (SELECT "id" FROM "Role" WHERE "name" = 'ADMIN');

INSERT INTO "RolePermission" ("roleId", "module", "action")
SELECT role."id", permissions."module"::"AdminModule", permissions."action"::"PermissionAction"
FROM "Role" role
CROSS JOIN (VALUES
    ('DASHBOARD', 'VIEW'), ('CLIENTS', 'VIEW'), ('CLIENTS', 'CREATE'), ('CLIENTS', 'EDIT'), ('CLIENTS', 'DELETE'),
    ('BILLING', 'VIEW'), ('BILLING', 'CREATE'), ('BILLING', 'EDIT'), ('BILLING', 'DELETE'),
    ('VOUCHERS', 'VIEW'), ('VOUCHERS', 'CREATE'), ('VOUCHERS', 'EDIT'), ('VOUCHERS', 'DELETE'),
    ('ACCOUNTS', 'VIEW'), ('ACCOUNTS', 'CREATE'), ('ACCOUNTS', 'EDIT'), ('ACCOUNTS', 'DELETE'),
    ('DOCUMENTS', 'VIEW'), ('DOCUMENTS', 'CREATE'), ('DOCUMENTS', 'EDIT'), ('DOCUMENTS', 'DELETE'),
    ('TAX', 'VIEW'), ('TAX', 'CREATE'), ('TAX', 'EDIT'), ('TAX', 'DELETE'),
    ('REPORTS', 'VIEW'),
    ('SETTINGS', 'VIEW'), ('SETTINGS', 'CREATE'), ('SETTINGS', 'EDIT'), ('SETTINGS', 'DELETE'),
    ('STAFF_MANAGEMENT', 'VIEW'), ('STAFF_MANAGEMENT', 'CREATE'), ('STAFF_MANAGEMENT', 'EDIT'), ('STAFF_MANAGEMENT', 'DELETE')
) AS permissions("module", "action")
WHERE role."name" = 'SUPER_ADMIN';

INSERT INTO "RolePermission" ("roleId", "module", "action")
SELECT role."id", permissions."module"::"AdminModule", permissions."action"::"PermissionAction"
FROM "Role" role
CROSS JOIN (VALUES
    ('DASHBOARD', 'VIEW'),
    ('CLIENTS', 'VIEW'), ('CLIENTS', 'CREATE'), ('CLIENTS', 'EDIT'), ('CLIENTS', 'DELETE'),
    ('BILLING', 'VIEW'), ('BILLING', 'CREATE'), ('BILLING', 'EDIT'), ('BILLING', 'DELETE'),
    ('VOUCHERS', 'VIEW'), ('VOUCHERS', 'CREATE'), ('VOUCHERS', 'EDIT'), ('VOUCHERS', 'DELETE'),
    ('ACCOUNTS', 'VIEW'), ('ACCOUNTS', 'CREATE'), ('ACCOUNTS', 'EDIT'), ('ACCOUNTS', 'DELETE'),
    ('DOCUMENTS', 'VIEW'), ('DOCUMENTS', 'CREATE'), ('DOCUMENTS', 'EDIT'), ('DOCUMENTS', 'DELETE'),
    ('TAX', 'VIEW'), ('TAX', 'CREATE'), ('TAX', 'EDIT'), ('TAX', 'DELETE'),
    ('REPORTS', 'VIEW'), ('SETTINGS', 'VIEW')
) AS permissions("module", "action")
WHERE role."name" = 'ADMIN';

INSERT INTO "RolePermission" ("roleId", "module", "action")
SELECT role."id", permissions."module"::"AdminModule", permissions."action"::"PermissionAction"
FROM "Role" role
CROSS JOIN (VALUES
    ('DASHBOARD', 'VIEW'),
    ('BILLING', 'VIEW'), ('BILLING', 'CREATE'), ('BILLING', 'EDIT'),
    ('VOUCHERS', 'VIEW'), ('VOUCHERS', 'CREATE'), ('VOUCHERS', 'EDIT'),
    ('ACCOUNTS', 'VIEW'), ('ACCOUNTS', 'CREATE'), ('ACCOUNTS', 'EDIT'),
    ('DOCUMENTS', 'VIEW'), ('DOCUMENTS', 'CREATE'),
    ('TAX', 'VIEW'), ('TAX', 'CREATE'), ('TAX', 'EDIT'),
    ('REPORTS', 'VIEW'), ('SETTINGS', 'VIEW')
) AS permissions("module", "action")
WHERE role."name" = 'ACCOUNTANT';

INSERT INTO "RolePermission" ("roleId", "module", "action")
SELECT role."id", permissions."module"::"AdminModule", permissions."action"::"PermissionAction"
FROM "Role" role
CROSS JOIN (VALUES
    ('DASHBOARD', 'VIEW'),
    ('CLIENTS', 'VIEW'),
    ('BILLING', 'VIEW'),
    ('VOUCHERS', 'VIEW'),
    ('DOCUMENTS', 'VIEW'), ('DOCUMENTS', 'CREATE'),
    ('TAX', 'VIEW'), ('REPORTS', 'VIEW')
) AS permissions("module", "action")
WHERE role."name" = 'STAFF';
