import type { JobicyJob, JobSearchFilters } from "@/types/job";

const API_URL = "https://jobicy.com/api/v2/remote-jobs";

export async function fetchJobicyJobs(filters: JobSearchFilters = {}): Promise<JobicyJob[]> {
  const url = new URL(API_URL);
  url.searchParams.set("count", "100");

  if (filters.geo?.trim()) url.searchParams.set("geo", filters.geo.trim());
  if (filters.industry?.trim()) url.searchParams.set("industry", filters.industry.trim());
  if (filters.keyword?.trim()) url.searchParams.set("tag", filters.keyword.trim());

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Jobicy-Integration-Example/nextjs-job-board"
      },
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 3600 }
    });
  } catch (error) {
    throw new Error(`Could not reach Jobicy: ${error instanceof Error ? error.message : "network error"}`);
  }

  if (!response.ok) {
    const message = response.status === 429
      ? "Jobicy is temporarily rate limiting requests. Please try again later."
      : `Jobicy returned HTTP ${response.status}.`;
    throw new Error(message);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error("Jobicy returned an invalid JSON response.");
  }

  if (!payload || typeof payload !== "object" || !("jobs" in payload) || !Array.isArray(payload.jobs)) {
    throw new Error("The Jobicy response did not contain a jobs array.");
  }

  const unique = new Map<string, JobicyJob>();

  for (const candidate of payload.jobs) {
    if (!candidate || typeof candidate !== "object" || !("id" in candidate) || !("url" in candidate)) continue;
    if (candidate.id == null || typeof candidate.url !== "string") continue;

    try {
      const canonical = new URL(candidate.url);
      if (canonical.protocol !== "https:" || canonical.hostname !== "jobicy.com") continue;
    } catch {
      continue;
    }

    unique.set(String(candidate.id), candidate as JobicyJob);
  }

  return [...unique.values()];
}

export function readableText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&hellip;/gi, "…")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatSalary(job: JobicyJob): string {
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

  return job.salaryPeriod ? `${amount} / ${job.salaryPeriod}` : amount;
}

export function formatPublicationDate(value: string | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
