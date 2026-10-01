import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";
import { JobicyClient, JobicyError } from "../node-client/src/index.js";

const job = (id, extra = {}) => ({ id, url: `https://jobicy.com/jobs/${id}`, jobTitle: "Python engineer", ...extra });
const page = (jobs, nextCursor = null) => ({ jobs, nextCursor, hasMore: nextCursor !== null });
const jsonResponse = (body, options) => new Response(JSON.stringify(body), options);

test("Node client preserves filters and opaque cursors through empty pages", async (t) => {
  const requests = [];
  const pages = [page([job(1), job(1)], "opaque+/= token"), page([], "second"), page([job(1), job(2)])];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(new URL(url));
    return jsonResponse(pages.shift());
  });
  const jobs = await new JobicyClient().getAllJobs({ count: 200, geo: "usa", industry: "engineering", tag: "python" });
  assert.deepEqual(jobs.map(({ id }) => id), [1, 2]);
  assert.equal(requests.length, 3);
  assert.equal(requests[0].searchParams.has("cursor"), false);
  assert.equal(requests[1].searchParams.get("cursor"), "opaque+/= token");
  for (const url of requests) {
    assert.equal(url.searchParams.get("count"), "200");
    assert.equal(url.searchParams.get("geo"), "usa");
    assert.equal(url.searchParams.get("industry"), "engineering");
    assert.equal(url.searchParams.get("tag"), "python");
  }
});

test("Node page metadata and array method remain distinct", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(page([job(1), job(2, { url: "https://example.com/job" })], "next")));
  const client = new JobicyClient();
  assert.deepEqual((await client.getJobs()).map(({ id }) => id), [1]);
  const result = await client.getJobsPage();
  assert.equal(result.nextCursor, "next");
  assert.equal(result.hasMore, true);
  await assert.rejects(client.getJobs({ count: 201 }), RangeError);
});

test("Node rejects cursor cycles and inconsistent metadata", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(page([], "repeat")));
  await assert.rejects(new JobicyClient().getAllJobs(), /repeated cursor/);
  globalThis.fetch = async () => jsonResponse({ jobs: [], nextCursor: null, hasMore: true });
  await assert.rejects(new JobicyClient().getJobsPage(), /pagination metadata/);
});

test("Node propagates expired cursors and rate limits without automatic loops", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    return jsonResponse({ error: "expired" }, { status: 400 });
  });
  await assert.rejects(new JobicyClient().getAllJobs({ cursor: "expired" }), (error) => error instanceof JobicyError && error.status === 400);
  assert.equal(calls, 1);
  globalThis.fetch = async () => jsonResponse({}, { status: 429, headers: { "Retry-After": "7200" } });
  await assert.rejects(new JobicyClient().getJobsPage(), (error) => error.status === 429 && error.retryAfterSeconds === 7200);
});

for (const bot of ["telegram-bot", "discord-bot", "slack-bot"]) {
  test(`${bot} traverses every page before local keyword filtering`, async (t) => {
    const { fetchJobs } = await import(`../${bot}/src/jobicy.js`);
    const requests = [];
    const pages = [page([job(1, { jobTitle: "Design role" })], "opaque+/="), page([job(2)], "last"), page([job(2), job(3)])];
    t.mock.method(globalThis, "fetch", async (url) => {
      requests.push(new URL(url));
      return jsonResponse(pages.shift());
    });
    const jobs = await fetchJobs({ geo: "usa", keywords: "python,backend", project: bot });
    assert.deepEqual(jobs.map(({ id }) => id), [2, 3]);
    assert.equal(requests.length, 3);
    assert.equal(requests[1].searchParams.get("cursor"), "opaque+/=");
    assert.equal(requests[2].searchParams.get("geo"), "usa");
    globalThis.fetch = async () => jsonResponse(page([], "repeat"));
    await assert.rejects(fetchJobs({ project: bot }), /repeated cursor/);
  });

  test(`${bot} retains more than 2,000 visible IDs across restart and prunes absent IDs`, async () => {
    const { SeenJobStore } = await import(`../${bot}/src/storage.js`);
    const directory = await mkdtemp(path.join(tmpdir(), "jobicy-state-"));
    try {
      const file = path.join(directory, "state.json");
      const store = new SeenJobStore(file);
      await store.load();
      const jobs = Array.from({ length: 2100 }, (_, index) => job(index));
      await store.baseline(jobs);
      const restored = new SeenJobStore(file);
      await restored.load();
      assert.equal(restored.initialized, true);
      assert.equal(restored.ids.size, 2100);
      assert.equal(jobs.every(({ id }) => restored.has(id)), true);
      await restored.retain([job(2099), job(2100)]);
      assert.equal(restored.has(0), false);
      assert.equal(restored.has(2099), true);
      assert.equal(restored.has(2100), false);
      await restored.remember(2100);
      assert.equal(restored.has(2100), true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}

test("n8n combines all pages, rejects incomplete traversal, and preserves large baselines", async () => {
  const workflow = JSON.parse(await readFile(new URL("../n8n/jobicy-telegram-workflow.json", import.meta.url), "utf8"));
  const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]));
  const pagination = nodes["Request Jobicy jobs"].parameters.options.pagination.pagination;
  assert.equal(pagination.paginationMode, "responseContainsNextURL");
  const evaluate = (expression, context) => vm.runInNewContext(expression.slice(3, -2).trim(), { ...context, encodeURIComponent });
  const url = new URL(evaluate(pagination.nextURL, {
    $: () => ({ first: () => ({ json: { count: 100, geo: "usa", industry: "engineering" } }) }),
    $response: { body: page([], "opaque+/=") }
  }));
  assert.equal(url.searchParams.get("cursor"), "opaque+/=");
  assert.equal(url.searchParams.get("geo"), "usa");
  assert.equal(evaluate(pagination.completeExpression, { $response: { body: page([]) } }), true);
  assert.equal(evaluate(pagination.completeExpression, { $response: { body: page([], "next") } }), false);
  const run = (name, items, state = {}) => new Function("$input", "$getWorkflowStaticData", "URL", nodes[name].parameters.jsCode)(
    { all: () => items }, () => state, URL
  );
  const extracted = run("Extract jobs", [{ json: page([job(1)], "next") }, { json: page([job(1), job(2)]) }]);
  assert.deepEqual(extracted.map(({ json }) => json.id), [1, 2]);
  assert.throws(() => run("Extract jobs", [{ json: page([job(1)], "incomplete") }]), /safety limit/);
  const state = {};
  const many = Array.from({ length: 2100 }, (_, index) => ({ json: job(index) }));
  assert.deepEqual(run("Deduplicate and format", many, state), []);
  assert.equal(state.jobIds.length, 2100);
  assert.deepEqual(run("Deduplicate and format", many, state), []);
  assert.equal(run("Deduplicate and format", [...many, { json: job(2101) }], state).length, 1);
});

test("Zapier exposes continuation even when local filtering removes the page", async () => {
  const code = await readFile(new URL("../zapier/code-step.js", import.meta.url), "utf8");
  const context = vm.createContext({
    inputData: { count: "200", cursor: "opaque+/=", geo: "usa", keywords: "not-a-match" },
    URL, AbortSignal,
    fetch: async (url) => {
      assert.equal(url.searchParams.get("cursor"), "opaque+/=");
      assert.equal(url.searchParams.get("count"), "200");
      return jsonResponse(page([job(1)], "next"));
    }
  });
  await vm.runInContext(`(async () => { ${code} })()`, context);
  assert.equal(context.output.count, 0);
  assert.equal(context.output.nextCursor, "next");
  assert.equal(context.output.hasMore, true);
});
