const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

test("the install manifest opens the admin dashboard and retains the existing app identity", () => {
  const source = fs.readFileSync(path.join(__dirname, "../app/manifest.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports });
  const manifest = exports.default();
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/admin");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
});
