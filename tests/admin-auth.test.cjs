const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../lib/admin/auth.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadAuth({ env = {}, user = null, token } = {}) {
  const calls = [];
  const exports = {};
  const mocks = {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: () => token && { value: token } }) },
    "next/navigation": { redirect: () => { throw new Error("redirect"); }, notFound: () => { throw new Error("not found"); } },
    jose: {
      errors: {},
      jwtVerify: async () => ({ payload: { sub: "session-user" } }),
    },
    "@prisma/client": {},
    "@/lib/prisma": {
      prisma: { user: { findUnique: async (query) => { calls.push(query); return user; } } },
    },
  };
  vm.runInNewContext(compiled, {
    exports,
    require: (id) => id in mocks ? mocks[id] : require(id),
    process: { env },
    Buffer,
    TextEncoder,
  });
  return { auth: exports, calls };
}

const superAdmin = {
  id: "admin-id",
  name: "Administrator",
  email: "admin@example.test",
  isActive: true,
  role: { name: "SUPER_ADMIN", permissions: [] },
};

test("normal mode requires a session and looks up authenticated users by id", async () => {
  const anonymous = loadAuth();
  assert.equal(await anonymous.auth.getCurrentAdmin(), null);
  assert.equal(anonymous.calls.length, 0);

  const signedIn = loadAuth({ user: superAdmin, token: "token", env: { SESSION_SECRET: "x".repeat(32) } });
  assert.equal((await signedIn.auth.getCurrentAdmin()).id, "admin-id");
  assert.equal(signedIn.calls[0].where.id, "session-user");
});

test("enabled bypass uses the configured active super administrator", async () => {
  const { auth, calls } = loadAuth({
    env: { ADMIN_AUTH_BYPASS: "true", ADMIN_AUTH_BYPASS_EMAIL: " ADMIN@EXAMPLE.TEST " },
    user: superAdmin,
  });
  assert.equal((await auth.requirePermission("BILLING", "EDIT")).id, "admin-id");
  assert.equal(calls[0].where.email, "admin@example.test");
});

test("bypass fails closed for missing, inactive or non-super-admin accounts", async () => {
  for (const user of [null, { ...superAdmin, isActive: false }, { ...superAdmin, role: { name: "STAFF", permissions: [] } }]) {
    const { auth } = loadAuth({
      env: { ADMIN_AUTH_BYPASS: "true", ADMIN_AUTH_BYPASS_EMAIL: "admin@example.test" },
      user,
    });
    await assert.rejects(auth.getCurrentAdmin(), /active super administrator/);
  }
  const { auth } = loadAuth({ env: { ADMIN_AUTH_BYPASS: "true" } });
  await assert.rejects(auth.getCurrentAdmin(), /ADMIN_AUTH_BYPASS_EMAIL/);
});
