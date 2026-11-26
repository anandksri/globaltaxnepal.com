const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function compile(file) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
}

function load(compiled, mocks, env = {}) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (id) => id in mocks ? mocks[id] : require(id),
    process: { env },
    Buffer, Uint8Array, File, Response,
    console: { error: () => {} },
  });
  return exports;
}

const routeSource = compile("app/api/enquiries/route.ts");
const fileSource = compile("app/admin/(protected)/enquiries/[id]/file/route.ts");

function setup({ failDatabase = false, failEmail = false, failStatus = false, smtp = true } = {}) {
  const saved = [];
  const updates = [];
  const emails = [];
  const route = load(routeSource, {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    "@/lib/prisma": { prisma: { websiteEnquiry: {
      create: async ({ data }) => {
        if (failDatabase) throw new Error("database down");
        saved.push(data);
        return { id: "enquiry-1" };
      },
      update: async (query) => {
        if (failStatus) throw new Error("database down");
        updates.push(query);
      },
    } } },
    nodemailer: { createTransport: () => ({ sendMail: async (message) => {
      if (failEmail) throw new Error("SMTP down");
      emails.push(message);
    } }) },
  }, smtp ? { SMTP_USER: "sender@example.test", SMTP_PASSWORD: "password", CONTACT_EMAIL: "contact@example.test" } : {});
  return { route, saved, updates, emails };
}

function enquiryForm() {
  const data = new FormData();
  data.set("name", "Test User");
  data.set("whatsapp", "9800000000");
  data.set("email", "sender@example.test");
  data.set("subject", "Service: Tax Planning & Filing | Advice");
  data.set("message", "Please advise me about filing taxes.");
  return data;
}

function request(data) {
  return { formData: async () => data };
}

test("valid enquiries and attachments are saved and emailed", async () => {
  const ctx = setup();
  const data = enquiryForm();
  data.set("file", new File(["file contents"], "proof.txt", { type: "text/plain" }));
  const result = await ctx.route.POST(request(data));
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(ctx.saved.length, 1);
  assert.equal(ctx.saved[0].name, "Test User");
  assert.equal(ctx.saved[0].subject, "Service: Tax Planning & Filing | Advice");
  assert.equal(Buffer.from(ctx.saved[0].attachmentData).toString(), "file contents");
  assert.equal(ctx.emails[0].to, "contact@example.test");
  assert.equal(ctx.emails[0].attachments[0].content.toString(), "file contents");
  assert.equal(ctx.updates[0].data.emailStatus, "SENT");
});

test("mail failures retain the enquiry and report the delivery failure", async () => {
  for (const options of [{ failEmail: true }, { smtp: false }]) {
    const ctx = setup(options);
    const result = await ctx.route.POST(request(enquiryForm()));
    assert.equal(result.body.success, true);
    assert.match(result.body.message, /email notification could not be sent/);
    assert.equal(ctx.saved.length, 1);
    assert.equal(ctx.updates[0].data.emailStatus, "FAILED");
  }
});

test("invalid or unsaved enquiries do not send email", async () => {
  const invalid = setup();
  const bad = enquiryForm();
  bad.set("message", "short");
  assert.equal((await invalid.route.POST(request(bad))).status, 400);
  const large = enquiryForm();
  large.set("file", new File([new Uint8Array(3 * 1024 * 1024 + 1)], "large.txt"));
  assert.equal((await invalid.route.POST(request(large))).status, 400);
  assert.equal(invalid.saved.length, 0);
  const unavailable = setup({ failDatabase: true });
  assert.equal((await unavailable.route.POST(request(enquiryForm()))).status, 503);
  assert.equal(unavailable.emails.length, 0);
});

test("attachment downloads require dashboard access and cannot be rendered inline", async () => {
  const calls = [];
  const route = load(fileSource, {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options.status }) } },
    "@/lib/admin/auth": { requirePermission: async (...permission) => { calls.push(permission); } },
    "@/lib/prisma": { prisma: { websiteEnquiry: { findUnique: async () => ({
      attachmentName: "proof.html", attachmentData: Buffer.from("<script>bad()</script>"),
    }) } } },
  });
  const response = await route.GET({}, { params: Promise.resolve({ id: "enquiry-1" }) });
  assert.deepEqual(calls[0], ["DASHBOARD", "VIEW"]);
  assert.equal(response.headers.get("content-type"), "application/octet-stream");
  assert.match(response.headers.get("content-disposition"), /^attachment;/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("unauthorized attachment requests never read stored files", async () => {
  let queried = false;
  const route = load(fileSource, {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options.status }) } },
    "@/lib/admin/auth": { requirePermission: async () => { throw new Error("forbidden"); } },
    "@/lib/prisma": { prisma: { websiteEnquiry: { findUnique: async () => { queried = true; } } } },
  });
  await assert.rejects(() => route.GET({}, { params: Promise.resolve({ id: "enquiry-1" }) }), /forbidden/);
  assert.equal(queried, false);
});
