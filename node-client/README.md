# Jobicy Node.js Client

A reusable, zero-dependency JavaScript client built on native Node.js `fetch`.

```bash
cd node-client
npm install
npm run example:search
npm run example:filter -- python,backend,platform
npm run example:export -- jobs.json
npm run example:pagination
npm run check
```

Node.js 20 or newer is required.

## Use in your project

```javascript
import { JobicyClient, formatSalary } from "./src/index.js";

const jobicy = new JobicyClient({ timeout: 15000 });
const jobs = await jobicy.getJobs({ count: 50, geo: "usa", industry: "engineering", tag: "python" });

for (const job of jobs) {
  console.log(job.jobTitle, job.companyName, formatSalary(job), job.url);
}
```

`getJobs()` validates the official `count`, `geo`, `industry`, and `tag` parameters; handles network timeouts, HTTP errors, invalid JSON, malformed payloads, and empty results; validates canonical Jobicy listing URLs; and deduplicates job IDs. `JobicyError` exposes `status` and `retryAfterSeconds` for controlled retry scheduling.

## Read all available pages

```javascript
for await (const job of jobicy.iterJobs({ count: 100, geo: "usa" })) {
  console.log(job.jobTitle, job.url);
}

const allJobs = await jobicy.getAllJobs({ count: 100 });
```

`getJobs()` keeps returning an array for one page. `getJobsPage()` returns `{ jobs, nextCursor, hasMore }` and accepts an optional `cursor`:

```javascript
const first = await jobicy.getJobsPage({ count: 100, geo: "usa" });
if (first.nextCursor !== null) {
  const second = await jobicy.getJobsPage({ count: 100, geo: "usa", cursor: first.nextCursor });
  console.log(second.jobs);
}
```

Counts range from 1 to 200 per page; the client default remains 50. Iterators retain filters, deduplicate IDs across pages, and reject repeated cursors. They continue through empty pages with a next cursor. They surface HTTP failures rather than silently returning a partial export. A cursor expires after 24 hours; on HTTP 400 restart without it and retain any delivered IDs. The feed covers the last seven days, not historical vacancies. Start new automated traversals hourly or less often.

## Check stored job statuses

`GET https://jobicy.com/api/v2/remote-jobs/status?ids=123456,123457,123458` checks up to 100 supplied IDs per request. Replace example IDs with IDs you have stored. Duplicate IDs are returned once in first-occurrence order. The response contains `checkedAt`, `count`, and `jobs: [{ id, status }]`.

`active` means open, `closed` means expired or filled, and `unknown` means the record is missing or not exposed publicly. The check includes older jobs outside the seven-day feed window. Absence from the feed does not imply closure. Keep `unknown` and request failures separate from `closed`.

Checks are free and require no key; a valid optional Bearer key adds `total_request_cost: 0`. Public results can be cached for 60 seconds. Split larger lists into batches, observe rate limits, and follow `Retry-After` on HTTP 429. Only `ids` is accepted; no cursor or feed filters apply. [Full status contract](https://github.com/Jobicy/remote-jobs-api#batch-status-check).

```javascript
const statuses = await jobicy.getJobStatuses([123456, 123457, 123458]);
for (const item of statuses) console.log(item.id, item.status);
```

```bash
npm run example:status -- 123456,123457,123458
```

`getJobStatuses()` returns an ordered array of `{ id, status }` records. It validates the batch and rejects incomplete, duplicate, or malformed response records. HTTP errors remain `JobicyError` instances with `status` and `retryAfterSeconds`.

[OpenAPI JSON](https://jobicy.com/api/openapi.json) · [OpenAPI YAML](https://jobicy.com/api/openapi.yaml)

`examples/filter.js` traverses the available feed and applies comma-separated case-insensitive local matching. `examples/export-json.js` traverses all pages and writes a real JSON export, including the original Jobicy URLs. Preserve source attribution and follow the [official Jobicy fair-use guidance](https://jobicy.com/jobs-rss-feed) in deployed automations.
