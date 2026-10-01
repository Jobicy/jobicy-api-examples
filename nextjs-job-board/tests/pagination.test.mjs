import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);

function load(file, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, URL, URLSearchParams, AbortSignal,
    require: (name) => dependencies[name] || require(name),
    ...globals
  }, { filename: file });
  return exports;
}

test("Next.js requests an API page with intact cursor and filters", async () => {
  let requested;
  const api = load("../lib/jobicy.ts", {}, {
    fetch: async (url, options) => {
      requested = new URL(url);
      assert.equal(options.next.revalidate, 3600);
      return new Response(JSON.stringify({
        jobs: [{ id: 1, url: "https://jobicy.com/jobs/1", companyLogo: false }],
        nextCursor: "next+/=", hasMore: true
      }));
    }
  });
  const result = await api.fetchJobicyPage({ geo: "usa", industry: "engineering", keyword: "python" }, "opaque+/= token");
  assert.equal(requested.searchParams.get("count"), "12");
  assert.equal(requested.searchParams.get("cursor"), "opaque+/= token");
  assert.equal(requested.searchParams.get("geo"), "usa");
  assert.equal(requested.searchParams.get("industry"), "engineering");
  assert.equal(requested.searchParams.get("tag"), "python");
  assert.equal(result.nextCursor, "next+/=");
  assert.equal(result.jobs.length, 1);
});

test("Next.js pagination links retain filters and reset the cursor", () => {
  const pagination = load("../components/Pagination.tsx");
  const filters = { keyword: "python", geo: "usa", industry: "engineering" };
  const query = new URL(pagination.pageHref("opaque+/= token", filters), "http://localhost").searchParams;
  assert.equal(query.get("cursor"), "opaque+/= token");
  assert.equal(query.get("q"), "python");
  assert.equal(query.get("geo"), "usa");
  assert.equal(new URL(pagination.pageHref(null, filters), "http://localhost").searchParams.has("cursor"), false);
  const html = renderToStaticMarkup(pagination.default({ nextCursor: "next", isContinuation: true, ...filters }));
  assert.match(html, /Older listings/);
  assert.match(html, /Latest listings/);
  assert.doesNotMatch(html, /Page \d+ of/);
});

test("Next.js expired cursor shows a restart link retaining filters", async () => {
  const api = load("../lib/jobicy.ts", {}, {
    fetch: async () => new Response("{}", { status: 400 })
  });
  const placeholder = { __esModule: true, default: () => null };
  const pagination = load("../components/Pagination.tsx");
  const home = load("../app/page.tsx", {
    "@/lib/jobicy": api,
    "@/components/JobCard": placeholder,
    "@/components/JobFilters": placeholder,
    "@/components/Pagination": { __esModule: true, ...pagination }
  });
  const element = await home.default({ searchParams: Promise.resolve({ cursor: "expired", q: "python", geo: "usa" }) });
  const html = renderToStaticMarkup(element);
  assert.match(html, /Start a fresh search/);
  assert.match(html, /href="\/\?q=python&amp;geo=usa"/);
  assert.doesNotMatch(html, /Older listings/);
});
