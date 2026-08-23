const API_URL = "https://jobicy.com/api/v2/remote-jobs";
const MAX_COUNT = 100;
const REQUEST_TIMEOUT_MS = 15_000;

export class JobicyRequestError extends Error {
  constructor(message, status = null, retryAfterSeconds = null) {
    super(message);
    this.name = "JobicyRequestError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function fetchJobs({ geo = "", industry = "", keywords = "", count = 50, project }) {
  const limit = Math.max(1, Math.min(MAX_COUNT, Number.parseInt(String(count), 10) || 50));
  const url = new URL(API_URL);
  url.searchParams.set("count", String(limit));

  if (geo.trim()) url.searchParams.set("geo", geo.trim());
  if (industry.trim()) url.searchParams.set("industry", industry.trim());

  const terms = keywords.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);

  if (terms.length === 1) url.searchParams.set("tag", terms[0]);

  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": `Jobicy-Integration-Example/${project}`
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    throw new JobicyRequestError(`Jobicy request failed: ${error.message}`);
  }

  if (!response.ok) {
    const retryHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : null;
    throw new JobicyRequestError(`Jobicy API returned HTTP ${response.status}`, response.status, retryAfterSeconds);
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new JobicyRequestError("Jobicy API returned invalid JSON");
  }

  if (!payload || !Array.isArray(payload.jobs)) {
    throw new JobicyRequestError("Jobicy API response does not contain a jobs array");
  }

  const unique = new Map();

  for (const job of payload.jobs) {
    if (!job || typeof job !== "object" || job.id == null || typeof job.url !== "string") continue;

    let canonical;

    try {
      canonical = new URL(job.url);
    } catch {
      continue;
    }

    if (canonical.protocol !== "https:" || canonical.hostname !== "jobicy.com") continue;

    const searchable = [
      job.jobTitle,
      job.companyName,
      job.jobGeo,
      job.jobExcerpt,
      ...(Array.isArray(job.jobIndustry) ? job.jobIndustry : []),
      ...(Array.isArray(job.jobType) ? job.jobType : [])
    ].filter(Boolean).join(" ").toLowerCase();

    if (terms.length && !terms.some((term) => searchable.includes(term))) continue;

    unique.set(String(job.id), job);
  }

  return [...unique.values()];
}

export function formatSalary(job) {
  const minimum = Number(job.salaryMin);
  const maximum = Number(job.salaryMax);
  const hasMinimum = Number.isFinite(minimum) && minimum > 0;
  const hasMaximum = Number.isFinite(maximum) && maximum > 0;

  if (!hasMinimum && !hasMaximum) return "";

  const currency = typeof job.salaryCurrency === "string" && /^[A-Z]{3}$/i.test(job.salaryCurrency)
    ? job.salaryCurrency.toUpperCase()
    : "USD";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  });
  const amount = hasMinimum && hasMaximum && minimum !== maximum
    ? `${formatter.format(minimum)}–${formatter.format(maximum)}`
    : formatter.format(hasMinimum ? minimum : maximum);
  const period = typeof job.salaryPeriod === "string" && job.salaryPeriod.trim()
    ? ` / ${job.salaryPeriod.trim()}`
    : "";

  return `${amount}${period}`;
}

export function normalizeText(value, maxLength = 300) {
  const text = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp|hellip);/gi, (entity) => ({
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
      "&#39;": "'",
      "&nbsp;": " ",
      "&hellip;": "…"
    }[entity.toLowerCase()] || entity))
    .replace(/\s+/g, " ")
    .trim();

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
