const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../prisma/seed.mjs"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

test("repeated deployment seeds do not overwrite an existing administrator password", async () => {
  let user;
  const client = {
    role: { upsert: async () => ({ id: "super-admin" }) },
    user: {
      upsert: async ({ create, update }) => {
        user = user ? { ...user, ...update } : { ...create };
        return user;
      },
    },
    $transaction: async (run) => run(client),
    $disconnect: async () => {},
  };
  const mocks = {
    "@prisma/client": { PrismaClient: class { constructor() { return client; } } },
    bcryptjs: { hash: async () => "seeded-password-hash" },
  };
  async function seed() {
    await vm.runInNewContext(`(async () => { ${compiled} })()`, {
      exports: {},
      require: (id) => id in mocks ? mocks[id] : require(id),
      process: { env: { ADMIN_EMAIL: "admin@example.test", ADMIN_PASSWORD: "initial password" } },
      Buffer,
      console: { info: () => {}, error: () => {} },
    });
  }
  await seed();
  assert.equal(user.passwordHash, "seeded-password-hash");
  user.passwordHash = "reset-password-hash";
  await seed();
  assert.equal(user.passwordHash, "reset-password-hash");
});
