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

function loadAuth({ env = {}, user = null, token, payload = { sub: "session-user" } } = {}) {
  const calls = [];
  const exports = {};
  const mocks = {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: () => token && { value: token } }) },
    "next/navigation": { redirect: () => { throw new Error("redirect"); }, notFound: () => { throw new Error("not found"); } },
    jose: {
      errors: {},
      jwtVerify: async () => ({ payload }),
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
  sessionVersion: 0,
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

test("reset invalidates both old and remembered sessions", async () => {
  const resetUser = { ...superAdmin, sessionVersion: 1 };
  const old = loadAuth({ user: resetUser, token: "old", env: { SESSION_SECRET: "x".repeat(32) } });
  assert.equal(await old.auth.getCurrentAdmin(), null);
  const current = loadAuth({
    user: resetUser,
    token: "new",
    payload: { sub: "session-user", sessionVersion: 1 },
    env: { SESSION_SECRET: "x".repeat(32) },
  });
  assert.equal((await current.auth.getCurrentAdmin()).id, "admin-id");
});
