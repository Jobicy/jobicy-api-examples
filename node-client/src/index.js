export class JobicyError extends Error {
  constructor(message, { status = null, retryAfterSeconds = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "JobicyError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class JobicyClient {
  constructor({ timeout = 15_000 } = {}) {
    if (!Number.isFinite(timeout) || timeout <= 0) {
      throw new TypeError("timeout must be a positive number of milliseconds");
    }

    this.timeout = timeout;
    this.apiUrl = "https://jobicy.com/api/v2/remote-jobs";
  }

  async getJobs({ count = 50, geo = "", industry = "", tag = "" } = {}) {
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      throw new RangeError("count must be an integer between 1 and 100");
    }

    const url = new URL(this.apiUrl);
    url.searchParams.set("count", String(count));

    for (const [name, value] of Object.entries({ geo, industry, tag })) {
      if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
      if (value.trim()) url.searchParams.set(name, value.trim());
    }

    let response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Jobicy-Integration-Example/node-client"
        },
        signal: AbortSignal.timeout(this.timeout)
      });
    } catch (error) {
      throw new JobicyError(`Jobicy request failed: ${error.message}`, { cause: error });
    }

    if (!response.ok) {
      const retryHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : null;
      throw new JobicyError(`Jobicy API returned HTTP ${response.status}`, {
        status: response.status,
        retryAfterSeconds
      });
    }

    let payload;

    try {
      payload = await response.json();
    } catch (error) {
      throw new JobicyError("Jobicy API returned invalid JSON", { cause: error });
    }

    if (!payload || !Array.isArray(payload.jobs)) {
      throw new JobicyError("Jobicy API response does not contain a jobs array");
    }

    const unique = new Map();

    for (const job of payload.jobs) {
      if (!job || typeof job !== "object" || job.id == null || typeof job.url !== "string") continue;

      try {
        const canonical = new URL(job.url);
        if (canonical.protocol !== "https:" || canonical.hostname !== "jobicy.com") continue;
      } catch {
        continue;
      }

      unique.set(String(job.id), job);
    }

    return [...unique.values()];
  }
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
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  const amount = hasMinimum && hasMaximum && minimum !== maximum
    ? `${formatter.format(minimum)}–${formatter.format(maximum)}`
    : formatter.format(hasMinimum ? minimum : maximum);

  return job.salaryPeriod ? `${amount} / ${job.salaryPeriod}` : amount;
}
