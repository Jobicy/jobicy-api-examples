import assert from "node:assert/strict";
import { test } from "node:test";
import { JobicyClient, JobicyError } from "../node-client/src/index.js";

const payload = (jobs, extra = {}) => ({ success: true, count: jobs.length, jobs, ...extra });
const record = (id, status = "active") => ({ id, status });
const response = (value, options) => new Response(JSON.stringify(value), options);

test("Status client deduplicates and restores request order", async (t) => {
  let requested;
  t.mock.method(globalThis, "fetch", async (url) => {
    requested = new URL(url);
    return response(payload([record(3, "unknown"), record(2, "closed"), record(1)]));
  });
  assert.deepEqual(await new JobicyClient().getJobStatuses([1, " 2 ", 1, 3]), [record(1), record(2, "closed"), record(3, "unknown")]);
  assert.equal(requested.pathname, "/api/v2/remote-jobs/status");
  assert.equal(requested.search, "?ids=1%2C2%2C3");
});

test("Status validates batch before making requests and accepts maximum IDs", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    const ids = new URL(url).searchParams.get("ids").split(",").map(Number);
    requests.push(ids);
    return response(payload(ids.map((id) => record(id, "unknown"))));
  });
  const client = new JobicyClient();
  for (const ids of [[], "1", [0], [-1], [true], [1.5], ["001"], ["+1"], ["1e3"], [9007199254740992], [null], Array(101).fill(1)]) {
    await assert.rejects(client.getJobStatuses(ids));
  }
  assert.equal(requests.length, 0);
  assert.equal((await client.getJobStatuses(Array(100).fill(9007199254740991))).length, 1);
});

test("Status rejects incomplete, unexpected, duplicate and invalid records", async (t) => {
  t.mock.method(globalThis, "fetch", async () => response(payload([])));
  const invalid = [
    payload([], { count: 2 }),
    payload([record(1), record(1)]),
    payload([record(1), record(3)]),
    payload([record(1), record(2, "expired")]),
    payload([record(1), record("2")]),
    payload([record(1), record(2)], { success: false }),
    null
  ];
  for (const value of invalid) {
    globalThis.fetch = async () => response(value);
    await assert.rejects(new JobicyClient().getJobStatuses([1, 2]), JobicyError);
  }
});

test("Status preserves HTTP errors and Retry-After without inventing closure", async (t) => {
  t.mock.method(globalThis, "fetch", async () => response({}, { status: 400 }));
  await assert.rejects(new JobicyClient().getJobStatuses([1]), (error) => error.status === 400);
  globalThis.fetch = async () => response({}, { status: 429, headers: { "Retry-After": "60" } });
  await assert.rejects(new JobicyClient().getJobStatuses([1]), (error) => error.status === 429 && error.retryAfterSeconds === 60);
});
