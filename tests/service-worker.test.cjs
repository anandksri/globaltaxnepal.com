const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../public/service-worker.js"), "utf8");

function worker(fetch) {
  const handlers = {};
  vm.runInNewContext(source, {
    self: {
      location: { origin: "https://example.test" },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      skipWaiting: () => {},
      clients: { claim: () => {} },
    },
    fetch, Response, URL,
  });
  return handlers;
}

test("offline navigation returns a useful page without caching private content", async () => {
  const handlers = worker(async () => { throw new Error("offline"); });
  let response;
  handlers.fetch({
    request: { method: "GET", mode: "navigate", url: "https://example.test/admin" },
    respondWith: (promise) => { response = promise; },
  });
  const result = await response;
  assert.equal(result.status, 503);
  assert.match(await result.text(), /You are offline/);
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("online navigations return the original network response", async () => {
  const networkResponse = new Response("live content", { status: 200 });
  const handlers = worker(async () => networkResponse);
  let response;
  handlers.fetch({
    request: { method: "GET", mode: "navigate", url: "https://example.test/" },
    respondWith: (promise) => { response = promise; },
  });
  assert.equal(await response, networkResponse);
});

test("non-navigation, non-GET and cross-origin requests are left untouched", () => {
  const handlers = worker(() => { throw new Error("should not fetch"); });
  for (const request of [
    { method: "POST", mode: "navigate", url: "https://example.test/" },
    { method: "GET", mode: "cors", url: "https://example.test/api/enquiries" },
    { method: "GET", mode: "navigate", url: "https://other.test/" },
  ]) {
    let intercepted = false;
    handlers.fetch({ request, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  }
});
