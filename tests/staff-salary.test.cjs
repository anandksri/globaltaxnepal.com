const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

function loadModule(relative) {
  const filename = path.join(__dirname, "..", relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(code, filename);
  return loaded.exports;
}

const months = loadModule("lib/admin/client-monthly-data.ts");
const salaryPath = path.join(__dirname, "../lib/admin/staff-salary.ts");
const salaryCode = ts.transpileModule(fs.readFileSync(salaryPath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const salary = {};
vm.runInNewContext(salaryCode, { exports: salary, require: (id) => id === "./client-monthly-data" ? months : require(id) });

test("validates years and salary amounts without losing zero or rounding", () => {
  assert.equal(salary.parseSalaryYear("2083").data, 2083);
  for (const year of ["2083x", "1999", "", "२०८३"]) assert.equal(salary.parseSalaryYear(year).success, false);
  const amounts = salary.emptySalaryAmounts();
  amounts.baisakh = "०";
  amounts.jestha = "1234567890.12";
  const parsed = salary.parseSalaryAmounts(amounts);
  assert.equal(parsed.success, true);
  assert.equal(parsed.amounts.baisakh, "0");
  assert.equal(parsed.amounts.jestha, "1234567890.12");
  for (const invalid of ["-1", "1.234", "10000000000", "1e2", ".50"]) {
    amounts.baisakh = invalid;
    assert.equal(salary.parseSalaryAmounts(amounts).success, false);
  }
});

function loadActions(roleName = "STAFF") {
  const calls = [];
  const tx = {
    user: { findUnique: async () => ({ role: { name: roleName } }) },
    manualSalaryStaff: {
      findUnique: async () => ({ id: "c123456789012345678901234" }),
      update: async (args) => calls.push(["details", args]),
      create: async (args) => { calls.push(["create", args]); return { id: "c123456789012345678901234" }; },
    },
    staffSalaryYear: { upsert: async (args) => calls.push(["salary", args]) },
    activityLog: { create: async (args) => calls.push(["audit", args]) },
  };
  const mocks = {
    "@prisma/client": require("@prisma/client"),
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect: (url) => { throw new Error(`REDIRECT ${url}`); } },
    "@/lib/admin/auth": { requirePermission: async (module, action) => { calls.push(["permission", module, action]); return { id: "actor", roleName: "STAFF" }; } },
    "@/lib/admin/client-monthly-data": months,
    "@/lib/admin/staff-salary": salary,
    "@/lib/prisma": { prisma: { $transaction: (callback) => callback(tx) } },
  };
  const filename = path.join(__dirname, "../app/admin/(protected)/settings/staff/salary/actions.ts");
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), console });
  return { ...exports, calls };
}

function form() {
  const data = new FormData();
  for (const month of months.nepaliMonths) data.set(month.key, "");
  data.set("jestha", "१२३.४५");
  data.set("remarks", "Paid");
  for (const [key, value] of Object.entries({ name: " Manual staff ", email: "", phone: "9800000000", address: "Kathmandu", designation: "Assistant", year: "2083" })) data.set(key, value);
  return data;
}

test("saves a specific year with view and edit permissions and an audit record", async () => {
  const { saveSalary, calls } = loadActions();
  const result = await saveSalary("manual", "c123456789012345678901234", "2083", {}, form());
  assert.match(result.success, /saved/);
  assert.ok(calls.some(([type, module, action]) => type === "permission" && module === "STAFF_MANAGEMENT" && action === "VIEW"));
  assert.ok(calls.some(([type, module, action]) => type === "permission" && module === "STAFF_MANAGEMENT" && action === "EDIT"));
  const upsert = calls.find(([type]) => type === "salary")[1];
  assert.equal(upsert.where.manualStaffId_year.year, 2083);
  assert.equal(upsert.create.amounts.jestha, "123.45");
  assert.equal(calls.find(([type]) => type === "details")[1].data.phone, "9800000000");
  assert.equal(calls.find(([type]) => type === "audit")[1].data.metadata.year, 2083);
});

test("rejects invalid amounts and protects super-admin account salary edits", async () => {
  const normal = loadActions();
  const data = form();
  data.set("jestha", "-5");
  assert.ok((await normal.saveSalary("account", "c123456789012345678901234", "2083", {}, data)).error);
  assert.equal(normal.calls.some(([type]) => type === "salary"), false);
  const privileged = loadActions("SUPER_ADMIN");
  assert.ok((await privileged.saveSalary("account", "c123456789012345678901234", "2083", {}, form())).error);
  assert.equal(privileged.calls.some(([type]) => type === "salary"), false);
});

test("manual staff creation requires create permission and does not create an account", async () => {
  const { createManualStaff, calls } = loadActions();
  await assert.rejects(createManualStaff({}, form()), /REDIRECT .*manual\/.*year=2083/);
  assert.ok(calls.some(([type, module, action]) => type === "permission" && module === "STAFF_MANAGEMENT" && action === "CREATE"));
  assert.equal(calls.find(([type]) => type === "create")[1].data.name, "Manual staff");
  assert.ok(calls.some(([type]) => type === "audit"));
});
