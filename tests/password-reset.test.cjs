const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/admin/forgot-password/actions.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

function setup(initialUser = { id: "u1", email: "user@example.test", passwordHash: "old-hash", isActive: true }, { failDelivery = false } = {}) {
  let user = initialUser;
  let reset = null;
  const emails = [];
  let challengesDeleted = 0;
  let invitationsDeleted = 0;
  class KnownError extends Error { constructor(code) { super(code); this.code = code; } }
  const prisma = {
    user: {
      findUnique: async ({ where }) => user && (where.id === user.id || where.email === user.email) ? { ...user } : null,
      updateMany: async ({ where, data }) => {
        if (!user || !user.isActive || user.id !== where.id || user.email !== where.email || user.passwordHash !== where.passwordHash) return { count: 0 };
        user.passwordHash = data.passwordHash;
        user.sessionVersion = (user.sessionVersion || 0) + 1;
        return { count: 1 };
      },
    },
    adminPasswordReset: {
      updateMany: async ({ where, data }) => {
        if (!reset || reset.userId !== where.userId || reset.createdAt > where.createdAt.lte) return { count: 0 };
        reset = { ...reset, ...data };
        return { count: 1 };
      },
      create: async ({ data }) => { if (reset) throw new KnownError("P2002"); reset = { ...data }; },
      findUnique: async ({ where }) => reset && reset.tokenHash === where.tokenHash ? { ...reset } : null,
      deleteMany: async ({ where }) => {
        if (!reset || reset.userId !== where.userId || reset.tokenHash !== where.tokenHash ||
          (where.expiresAt && reset.expiresAt <= where.expiresAt.gt) || (where.user && !user?.isActive)) return { count: 0 };
        reset = null;
        return { count: 1 };
      },
    },
    adminTwoFactorChallenge: { deleteMany: async () => { challengesDeleted++; } },
    userInvitation: { deleteMany: async () => { invitationsDeleted++; } },
    $transaction: async (fn) => fn(prisma),
  };
  const exports = {};
  const mocks = {
    "@prisma/client": { Prisma: { PrismaClientKnownRequestError: KnownError } },
    bcryptjs: { hash: async (password) => `hashed:${password}` },
    nodemailer: { createTransport: () => ({ sendMail: async (message) => {
      if (failDelivery) throw new Error("SMTP unavailable");
      emails.push(message);
    } }) },
    "@/lib/prisma": { prisma },
  };
  vm.runInNewContext(compiled, {
    exports, require: (id) => id in mocks ? mocks[id] : require(id),
    process: { env: { NEXT_PUBLIC_SITE_URL: "https://example.test", SMTP_USER: "smtp", SMTP_PASSWORD: "password" } },
    Buffer, URL, console,
  });
  return {
    actions: exports, emails,
    getUser: () => user,
    getReset: () => reset,
    expire: () => { reset.expiresAt = new Date(0); },
    changeCredentials: () => { user.passwordHash = "changed"; },
    cleanupCounts: () => [challengesDeleted, invitationsDeleted],
  };
}

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function tokenFrom(email) {
  return email.text.match(/\/admin\/reset-password\/([A-Za-z0-9_-]+)/)[1];
}

test("reset emails are generic, throttled, hashed, and single use", async () => {
  const ctx = setup();
  const request = form({ email: "USER@example.test" });
  const result = await ctx.actions.requestPasswordReset({}, request);
  assert.match(result.success, /If an active account exists/);
  await ctx.actions.requestPasswordReset({}, request);
  assert.equal(ctx.emails.length, 1);
  const token = tokenFrom(ctx.emails[0]);
  assert.notEqual(ctx.getReset().tokenHash, token);
  const password = form({ password: "a secure password", confirmPassword: "a secure password" });
  assert.match((await ctx.actions.resetPassword(token, {}, password)).success, /Password reset/);
  assert.equal(ctx.getUser().sessionVersion, 1);
  assert.deepEqual(ctx.cleanupCounts(), [1, 1]);
  assert.match((await ctx.actions.resetPassword(token, {}, password)).error, /invalid, expired/);
  const missing = setup(null);
  assert.equal((await missing.actions.requestPasswordReset({}, request)).success, result.success);
  assert.equal(missing.emails.length, 0);
});

test("expired links, changed credentials, and invalid passwords cannot reset accounts", async () => {
  const password = form({ password: "a secure password", confirmPassword: "a secure password" });
  for (const invalidate of ["expire", "changeCredentials"]) {
    const ctx = setup();
    await ctx.actions.requestPasswordReset({}, form({ email: "user@example.test" }));
    const token = tokenFrom(ctx.emails[0]);
    ctx[invalidate]();
    assert.match((await ctx.actions.resetPassword(token, {}, password)).error, /invalid, expired/);
    assert.equal(ctx.getUser().sessionVersion, undefined);
  }
  const ctx = setup();
  await ctx.actions.requestPasswordReset({}, form({ email: "user@example.test" }));
  const token = tokenFrom(ctx.emails[0]);
  assert.match((await ctx.actions.resetPassword(token, {}, form({ password: "short", confirmPassword: "short" }))).error, /11 characters/);
  assert.match((await ctx.actions.resetPassword(token, {}, form({ password: "a secure password", confirmPassword: "different password" }))).error, /do not match/);
  assert.match((await ctx.actions.resetPassword(token, {}, form({ password: "é".repeat(40), confirmPassword: "é".repeat(40) }))).error, /72 UTF-8 bytes/);
  assert.ok(ctx.getReset());
});

test("inactive accounts and failed delivery do not leave a usable reset link", async () => {
  const request = form({ email: "user@example.test" });
  const inactive = setup({ id: "u1", email: "user@example.test", passwordHash: "old-hash", isActive: false });
  assert.match((await inactive.actions.requestPasswordReset({}, request)).success, /If an active account exists/);
  assert.equal(inactive.getReset(), null);
  const failed = setup(undefined, { failDelivery: true });
  assert.match((await failed.actions.requestPasswordReset({}, request)).success, /If an active account exists/);
  assert.equal(failed.getReset(), null);
});
