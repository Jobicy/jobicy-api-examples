const settings = typeof inputData === "object" && inputData ? inputData : {};
const count = Number.parseInt(settings.count || "50", 10);

if (!Number.isInteger(count) || count < 1 || count > 100) {
  throw new Error("count must be an integer between 1 and 100");
}

const endpoint = new URL("https://jobicy.com/api/v2/remote-jobs");
endpoint.searchParams.set("count", String(count));

for (const key of ["geo", "industry", "tag"]) {
  if (String(settings[key] || "").trim()) {
    endpoint.searchParams.set(key, String(settings[key]).trim());
  }
}

const response = await fetch(endpoint, {
  headers: {
    Accept: "application/json",
    "User-Agent": "Jobicy-Integration-Example/zapier"
  },
  signal: AbortSignal.timeout(15_000)
});

if (!response.ok) {
  throw new Error(`Jobicy API returned HTTP ${response.status}`);
}

let payload;

try {
  payload = await response.json();
} catch {
  throw new Error("Jobicy API returned invalid JSON");
}

if (!payload || !Array.isArray(payload.jobs)) {
  throw new Error("Jobicy API response does not contain a jobs array");
}

const seen = new Set();
const keywords = String(settings.keywords || "")
  .split(",")
  .map((keyword) => keyword.trim().toLowerCase())
  .filter(Boolean);
const jobs = [];

for (const job of payload.jobs) {
  if (!job || typeof job !== "object" || job.id == null || typeof job.url !== "string") continue;

  let canonical;

  try {
    canonical = new URL(job.url);
  } catch {
    continue;
  }

  if (canonical.protocol !== "https:" || canonical.hostname !== "jobicy.com") continue;

  const id = String(job.id);
  if (seen.has(id)) continue;

  const searchable = [job.jobTitle, job.companyName, job.jobGeo, job.jobExcerpt]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (keywords.length && !keywords.some((keyword) => searchable.includes(keyword))) continue;

  seen.add(id);
  jobs.push({
    id,
    title: job.jobTitle || "Remote opportunity",
    company: job.companyName || "Company not specified",
    location: job.jobGeo || "Location not specified",
    excerpt: job.jobExcerpt || "",
    salary_min: job.salaryMin ?? "",
    salary_max: job.salaryMax ?? "",
    salary_currency: job.salaryCurrency || "",
    salary_period: job.salaryPeriod || "",
    url: job.url
  });
}

output = {
  count: jobs.length,
  ids: jobs.map((job) => job.id),
  titles: jobs.map((job) => job.title),
  companies: jobs.map((job) => job.company),
  locations: jobs.map((job) => job.location),
  excerpts: jobs.map((job) => job.excerpt),
  urls: jobs.map((job) => job.url),
  jobs_json: JSON.stringify(jobs)
};
