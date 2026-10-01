export interface JobicyJob {
  id: number | string;
  url: string;
  jobSlug?: string;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string | false;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
}

export interface JobicyResponse {
  jobs: JobicyJob[];
  jobCount?: number;
  lastUpdate?: string;
  nextCursor: string | null;
  hasMore: boolean;
}

export type JobicyPage = Pick<JobicyResponse, "jobs" | "nextCursor" | "hasMore">;

export interface JobSearchFilters {
  geo?: string;
  industry?: string;
  keyword?: string;
}
