import JobCard from "@/components/JobCard";
import JobFilters from "@/components/JobFilters";
import Pagination from "@/components/Pagination";
import { fetchJobicyJobs } from "@/lib/jobicy";

const PAGE_SIZE = 12;

type SearchParameters = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 120) || "";
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const parameters = await searchParams;
  const keyword = first(parameters.q);
  const geo = first(parameters.geo);
  const industry = first(parameters.industry);
  const requestedPage = Number.parseInt(first(parameters.page) || "1", 10);
  const jobs = await fetchJobicyJobs({ keyword, geo, industry });
  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1));
  const visibleJobs = jobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main className="shell">
      <header className="masthead">
        <a href="/" className="masthead__name">The Remote Work Index</a>
        <a href="https://jobicy.com/" className="masthead__source" target="_blank" rel="noopener noreferrer">Jobs powered by Jobicy</a>
      </header>

      <section className="intro">
        <p className="intro__eyebrow">Independent listing index</p>
        <h1>Remote jobs, without the noise.</h1>
        <p className="intro__description">A straightforward view of current remote openings. Filter what matters, then continue to the original listing.</p>
      </section>

      <JobFilters keyword={keyword} geo={geo} industry={industry} />

      <section className="results" aria-labelledby="results-heading">
        <div className="results__heading">
          <h2 id="results-heading">Latest opportunities</h2>
          <span>{jobs.length} {jobs.length === 1 ? "listing" : "listings"}</span>
        </div>

        {visibleJobs.length ? (
          <div className="job-list">{visibleJobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
        ) : (
          <div className="empty-state">
            <h3>No matching jobs right now.</h3>
            <p>Try a broader keyword or remove a location or industry filter.</p>
            <a href="/">Clear filters</a>
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} keyword={keyword} geo={geo} industry={industry} />
      </section>

      <footer className="footer">
        <span>Listings link directly to their original source.</span>
        <a href="https://jobicy.com/" target="_blank" rel="noopener noreferrer">Jobs powered by Jobicy</a>
      </footer>
    </main>
  );
}
