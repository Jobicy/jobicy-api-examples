# Jobicy Node.js Client

A reusable, zero-dependency JavaScript client built on native Node.js `fetch`.

```bash
cd node-client
npm install
npm run example:search
npm run example:filter -- python,backend,platform
npm run example:export -- jobs.json
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

`examples/filter.js` applies comma-separated case-insensitive local matching. `examples/export-json.js` writes a real JSON export, including the original Jobicy URLs. Preserve source attribution and follow the [official Jobicy fair-use guidance](https://jobicy.com/jobs-rss-feed) in deployed automations.
