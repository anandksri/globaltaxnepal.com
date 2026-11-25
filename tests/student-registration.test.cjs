const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const modulePath = path.join(__dirname, "../lib/admin/students.ts");
const source = fs.readFileSync(modulePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

function loadStudents() {
  const studentModule = new Module(modulePath, module);
  studentModule.filename = modulePath;
  studentModule.paths = Module._nodeModulePaths(path.dirname(modulePath));
  studentModule._compile(compiled, modulePath);
  return studentModule.exports;
}

function getValidFormData() {
  const formData = new FormData();
  formData.set("studentName", "Asha Student");
  formData.set("totalAmount", "12000.00");
  formData.set("receivedAmount", "2500.50");
  formData.set("approvalStatus", "PENDING");
  formData.append("serviceTypes", "STUDENT_ADMISSION");
  formData.append("serviceTypes", "PAN_REGISTRATION");
  const getAll = formData.getAll.bind(formData);
  formData.getAll = (name) => [...getAll(name)];
  return formData;
}

test("parses student details, selected services, and optional blank fields", () => {
  const parsed = loadStudents().getStudentRegistrationFormData(getValidFormData());

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.studentName, "Asha Student");
  assert.deepEqual(parsed.data.serviceTypes, [
    "STUDENT_ADMISSION",
    "PAN_REGISTRATION",
  ]);
  assert.equal(parsed.data.mobile, undefined);
  assert.equal(parsed.data.portalPassword, undefined);
  assert.equal(parsed.data.totalAmount, "12000.00");
});

test("rejects invalid service values, dates, and monetary formats", () => {
  const parse = loadStudents().getStudentRegistrationFormData;

  const invalidDate = getValidFormData();
  invalidDate.set("expectedCompletionDate", "2026-02-31");
  assert.equal(parse(invalidDate).success, false);

  const invalidMoney = getValidFormData();
  invalidMoney.set("totalAmount", "12.345");
  assert.equal(parse(invalidMoney).success, false);

  const invalidService = getValidFormData();
  invalidService.append("serviceTypes", "UNKNOWN");
  assert.equal(parse(invalidService).success, false);
});
