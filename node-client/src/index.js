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

  async getJobs(options = {}) {
    return (await this.getJobsPage(options)).jobs;
  }

  async *iterJobs(options = {}) {
    const filters = { ...options };
    let cursor = filters.cursor ?? null;
    const cursors = new Set(cursor ? [cursor] : []);
    const ids = new Set();

    do {
      const page = await this.getJobsPage({ ...filters, cursor });
      for (const job of page.jobs) {
        const id = String(job.id);
        if (ids.has(id)) continue;
        ids.add(id);
        yield job;
      }
      cursor = page.nextCursor;
      if (cursor && cursors.has(cursor)) throw new JobicyError("Jobicy returned a repeated cursor");
      if (cursor) cursors.add(cursor);
    } while (cursor);
  }

  async getAllJobs(options = {}) {
    const jobs = [];
    for await (const job of this.iterJobs(options)) jobs.push(job);
    return jobs;
  }

  async request(url) {
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

    return payload;
  }

  async getJobStatuses(ids) {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100) {
      throw new RangeError("ids must contain between 1 and 100 job IDs");
    }
    const normalized = [...new Set(ids.map((id) => {
      if (typeof id !== "number" && typeof id !== "string") throw new TypeError("Each job ID must be a positive integer");
      const value = String(id).trim();
      const number = Number(value);
      if (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(number)) {
        throw new RangeError("Each job ID must be a positive safe integer without leading zeros");
      }
      return number;
    }))];
    const url = new URL(`${this.apiUrl}/status`);
    url.searchParams.set("ids", normalized.join(","));
    const payload = await this.request(url);
    if (!payload || payload.success !== true || payload.count !== normalized.length || !Array.isArray(payload.jobs)) {
      throw new JobicyError("Jobicy API returned an invalid status response");
    }
    const requested = new Set(normalized);
    const result = new Map();
    for (const item of payload.jobs) {
      if (!item || !requested.has(item.id) || result.has(item.id) || !["active", "closed", "unknown"].includes(item.status)) {
        throw new JobicyError("Jobicy API returned an invalid status record");
      }
      result.set(item.id, { id: item.id, status: item.status });
    }
    if (result.size !== normalized.length) throw new JobicyError("Jobicy API returned an incomplete status response");
    return normalized.map((id) => result.get(id));
  }

  async getJobsPage({ count = 50, geo = "", industry = "", tag = "", cursor = null } = {}) {
    if (!Number.isInteger(count) || count < 1 || count > 200) {
      throw new RangeError("count must be an integer between 1 and 200");
    }

    const url = new URL(this.apiUrl);
    url.searchParams.set("count", String(count));

    if (cursor !== null) {
      if (typeof cursor !== "string" || !cursor.length) throw new TypeError("cursor must be a nonempty string or null");
      url.searchParams.set("cursor", cursor);
    }

    for (const [name, value] of Object.entries({ geo, industry, tag })) {
      if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
      if (value.trim()) url.searchParams.set(name, value.trim());
    }

    const payload = await this.request(url);

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

    const nextCursor = payload.nextCursor;
    if ((nextCursor !== null && (typeof nextCursor !== "string" || !nextCursor.length)) ||
        typeof payload.hasMore !== "boolean" || payload.hasMore !== (nextCursor !== null)) {
      throw new JobicyError("Jobicy API returned invalid pagination metadata");
    }

    return { jobs: [...unique.values()], nextCursor, hasMore: payload.hasMore };
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
