const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "../lib/admin/office-registers.ts");
const source = fs.readFileSync(modulePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = new Module(modulePath, module);
loaded.filename = modulePath;
loaded.paths = Module._nodeModulePaths(path.dirname(modulePath));
loaded._compile(compiled, modulePath);
const { registerDefinitions, validateRegisterData } = loaded.exports;

function emptyData(kind) {
  return Object.fromEntries(registerDefinitions[kind].sections.map((section) => [
    section.key,
    section.repeat ? [] : [Object.fromEntries(section.fields.map((field) => [field.key, ""]))],
  ]));
}

test("validates separate client register entries and rejects extra or invalid fields", () => {
  for (const kind of ["client-follow-up", "client-tracking", "file-movement"]) {
    const data = emptyData(kind);
    data.workTypes.push({ type: "PAN", details: "" });
    data.tasks.push({
      task: "c123456789012345678901234",
      startDate: "2026-11-25",
      startedBy: "",
      currentStage: "",
      currentFileWith: "",
      targetDate: "",
      followUpDate: "",
      discussion: "",
      nextFollowUp: "",
      remarks: "",
    });
    assert.equal(validateRegisterData(kind, data).success, true);
    data.tasks[0].startDate = "2026-02-31";
    assert.equal(validateRegisterData(kind, data).success, false);
    data.tasks[0].startDate = "";
    data.tasks[0].password = "not accepted";
    assert.equal(validateRegisterData(kind, data).success, false);
  }
  const period = emptyData("client-follow-up");
  period.period[0].from = "2026-11-30";
  period.period[0].to = "2026-11-01";
  assert.equal(validateRegisterData("client-follow-up", period).success, false);
});

test("staff time requires valid same-day start and end times", () => {
  const data = emptyData("staff-time");
  data.shift[0].date = "2026-11-25";
  data.entries.push({
    staff: "c123456789012345678901234",
    task: "c234567890123456789012345",
    start: "09:15",
    end: "17:30",
    remarks: "",
  });
  assert.equal(validateRegisterData("staff-time", data).success, true);
  data.entries[0].end = "09:15";
  assert.equal(validateRegisterData("staff-time", data).success, false);
  data.entries[0].end = "08:00";
  assert.equal(validateRegisterData("staff-time", data).success, false);
  data.entries[0].end = "25:00";
  assert.equal(validateRegisterData("staff-time", data).success, false);
});

function loadSaveAction(transaction) {
  const actionPath = path.join(__dirname, "../app/admin/(protected)/students/registers/actions.ts");
  const actionSource = fs.readFileSync(actionPath, "utf8");
  const actionCode = ts.transpileModule(actionSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const accessCalls = [];
  const mocks = {
    "@prisma/client": require("@prisma/client"),
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect: (url) => { throw new Error(`REDIRECT ${url}`); } },
    "@/lib/admin/office-registers": loaded.exports,
    "@/lib/prisma": { prisma: { $transaction: (callback) => callback(transaction) } },
    "./access": { requireRegisterAccess: async (...args) => { accessCalls.push(args); return { id: "c345678901234567890123456" }; } },
  };
  vm.runInNewContext(actionCode, {
    exports,
    require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id),
    console,
  });
  return { save: exports.saveRegister, accessCalls };
}

function transactionMock({ taskCount = 1 } = {}) {
  const calls = [];
  const recordId = "c456789012345678901234567";
  const tx = {
    client: { findUnique: async () => ({ id: "c567890123456789012345678" }) },
    user: { count: async () => 0 },
    complianceTask: { count: async (args) => { calls.push(["taskCount", args]); return taskCount; } },
    document: { count: async () => 0 },
    officeRegister: { create: async (args) => { calls.push(["create", args]); return { id: recordId }; } },
    officeRegisterStaff: { createMany: async (args) => calls.push(["staff", args]) },
    officeRegisterTask: { createMany: async (args) => calls.push(["tasks", args]) },
    officeRegisterDocument: { createMany: async (args) => calls.push(["documents", args]) },
    activityLog: { create: async (args) => calls.push(["activity", args]) },
  };
  return { tx, calls, recordId };
}

function clientRegisterForm() {
  const data = emptyData("client-tracking");
  data.tasks.push({
    task: "c123456789012345678901234",
    startDate: "",
    startedBy: "",
    currentStage: "",
    currentFileWith: "",
    targetDate: "",
    followUpDate: "",
    discussion: "",
    nextFollowUp: "",
    remarks: "",
  });
  const form = new FormData();
  form.set("kind", "client-tracking");
  form.set("title", "Client tracking");
  form.set("clientId", "c567890123456789012345678");
  form.set("data", JSON.stringify(data));
  return form;
}

test("saving a register checks client ownership and persists linked task and audit", async () => {
  const { tx, calls, recordId } = transactionMock();
  const { save, accessCalls } = loadSaveAction(tx);
  await assert.rejects(save(null, {}, clientRegisterForm()), new RegExp(`REDIRECT .*${recordId}`));
  assert.equal(accessCalls[0][0], "client-tracking");
  assert.equal(accessCalls[0][1], "CREATE");
  assert.equal(calls.find(([name]) => name === "taskCount")[1].where.clientId, "c567890123456789012345678");
  assert.equal(calls.find(([name]) => name === "tasks")[1].data[0].taskId, "c123456789012345678901234");
  assert.ok(calls.some(([name]) => name === "activity"));
});

test("saving rejects a task belonging to another client before creating records", async () => {
  const { tx, calls } = transactionMock({ taskCount: 0 });
  const { save } = loadSaveAction(tx);
  const result = await save(null, {}, clientRegisterForm());
  assert.match(result.error, /does not belong/);
  assert.equal(calls.some(([name]) => name === "create"), false);
});

test("register access requires student and relevant source permissions", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../app/admin/(protected)/students/registers/access.ts"), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const calls = [];
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (id) => id === "@/lib/admin/auth"
      ? { requirePermission: async (module, action) => { calls.push(`${module}:${action}`); if (module === "BILLING") throw new Error("forbidden"); return {}; } }
      : require(id),
  });
  await assert.rejects(exports.requireRegisterAccess("client-tracking", "CREATE"), /forbidden/);
  assert.ok(calls.includes("STUDENTS:VIEW"));
  assert.ok(calls.includes("STUDENTS:CREATE"));
  assert.ok(calls.includes("CLIENTS:VIEW"));
  assert.ok(calls.includes("TAX:VIEW"));
  assert.ok(calls.includes("DOCUMENTS:VIEW"));
  assert.ok(calls.includes("STAFF_MANAGEMENT:VIEW"));
  assert.ok(calls.includes("BILLING:VIEW"));
});
