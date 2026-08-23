export interface JobicyJob {
  id: number | string;
  url: string;
  jobSlug?: string;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string;
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
}

export interface JobSearchFilters {
  geo?: string;
  industry?: string;
  keyword?: string;
}
