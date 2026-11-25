const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "../lib/admin/client-monthly-data.ts");
const compiled = ts.transpileModule(fs.readFileSync(modulePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = new Module(modulePath, module);
loaded.filename = modulePath;
loaded.paths = Module._nodeModulePaths(path.dirname(modulePath));
loaded._compile(compiled, modulePath);
const { nepaliMonths, parseMonthlyDates } = loaded.exports;

function emptyDates() {
  return Object.fromEntries(nepaliMonths.map((month) => [month.key, ""]));
}

test("lists the twelve Nepali months from Baishakh through Chaitra", () => {
  assert.deepEqual(nepaliMonths.map((month) => month.label), [
    "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
  ]);
});

test("validates BS dates in the correct Nepali month and normalizes Nepali digits", () => {
  const dates = emptyDates();
  dates.shrawan = "२०८३-०४-३२";
  dates.baisakh = "2084-01-01";
  const result = parseMonthlyDates(dates);
  assert.equal(result.success, true);
  assert.equal(result.dates.shrawan, "2083-04-32");
  dates.shrawan = "2083-05-01";
  assert.equal(parseMonthlyDates(dates).success, false);
  dates.shrawan = "2083-04-33";
  assert.equal(parseMonthlyDates(dates).success, false);
  dates.shrawan = "2083-04-00";
  assert.equal(parseMonthlyDates(dates).success, false);
});

function loadAction(count) {
  const calls = [];
  const tx = {
    client: { findUnique: async () => ({ id: "c123456789012345678901234" }) },
    document: { count: async (args) => { calls.push(["count", args]); return count; } },
    clientMonthlyData: { upsert: async (args) => calls.push(["upsert", args]) },
    clientMonthlyDocument: {
      deleteMany: async () => calls.push(["delete"]),
      createMany: async (args) => calls.push(["links", args]),
    },
    activityLog: { create: async () => calls.push(["audit"]) },
  };
  const mocks = {
    "@prisma/client": require("@prisma/client"),
    "next/cache": { revalidatePath() {} },
    "@/lib/admin/auth": { requirePermission: async (module, action) => { calls.push(["permission", module, action]); return { id: "c345678901234567890123456" }; } },
    "@/lib/admin/client-monthly-data": loaded.exports,
    "@/lib/prisma": { prisma: { $transaction: (callback) => callback(tx) } },
  };
  const actionPath = path.join(__dirname, "../app/admin/(protected)/clients/monthly-data/actions.ts");
  const actionCode = ts.transpileModule(fs.readFileSync(actionPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(actionCode, { exports, require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), console });
  return { save: exports.saveMonthlyData, calls };
}

function form() {
  const data = new FormData();
  for (const month of nepaliMonths) data.set(month.key, "");
  data.set("shrawan", "२०८३-०४-०१");
  data.set("remarks", "Test");
  data.append("documentId", "c234567890123456789012345");
  return data;
}

test("saves monthly data and client-owned document links with permissions", async () => {
  const { save, calls } = loadAction(1);
  const result = await save("c123456789012345678901234", {}, form());
  assert.match(result.success, /saved/);
  assert.ok(calls.some(([type, module, action]) => type === "permission" && module === "CLIENTS" && action === "EDIT"));
  assert.ok(calls.some(([type, module, action]) => type === "permission" && module === "DOCUMENTS" && action === "VIEW"));
  assert.equal(calls.find(([type]) => type === "count")[1].where.clientId, "c123456789012345678901234");
  assert.equal(calls.find(([type]) => type === "upsert")[1].create.dates.shrawan, "2083-04-01");
  assert.equal(calls.find(([type]) => type === "links")[1].data[0].documentId, "c234567890123456789012345");
  assert.ok(calls.some(([type]) => type === "audit"));
});

test("rejects links to documents belonging to a different client", async () => {
  const { save, calls } = loadAction(0);
  const result = await save("c123456789012345678901234", {}, form());
  assert.match(result.error, /belongs to another client/);
  assert.equal(calls.some(([type]) => type === "upsert"), false);
});
