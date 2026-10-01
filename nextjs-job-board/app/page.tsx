import JobCard from "@/components/JobCard";
import JobFilters from "@/components/JobFilters";
import Pagination, { pageHref } from "@/components/Pagination";
import { fetchJobicyPage, JobicyCursorError } from "@/lib/jobicy";
import type { JobicyPage } from "@/types/job";

type SearchParameters = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 120) || "";
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const parameters = await searchParams;
  const keyword = first(parameters.q);
  const geo = first(parameters.geo);
  const industry = first(parameters.industry);
  const rawCursor = Array.isArray(parameters.cursor) ? parameters.cursor[0] : parameters.cursor;
  const cursor = rawCursor || undefined;
  let page: JobicyPage = { jobs: [], nextCursor: null, hasMore: false };
  let cursorError = "";
  try {
    if (cursor && cursor.length > 2048) throw new JobicyCursorError("This listing page is invalid. Start again from the latest listings.");
    page = await fetchJobicyPage({ keyword, geo, industry }, cursor);
  } catch (error) {
    if (!(error instanceof JobicyCursorError)) throw error;
    cursorError = error.message;
  }
  const { jobs, nextCursor } = page;

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
          <span>{jobs.length} {jobs.length === 1 ? "listing" : "listings"} on this page</span>
        </div>

        {cursorError ? (
          <div className="empty-state">
            <h3>Start a fresh search.</h3>
            <p>{cursorError}</p>
            <a href={pageHref(null, { keyword, geo, industry })}>Latest listings</a>
          </div>
        ) : jobs.length ? (
          <div className="job-list">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
        ) : (
          <div className="empty-state">
            <h3>No matching jobs right now.</h3>
            <p>Try a broader keyword or remove a location or industry filter.</p>
            <a href="/">Clear filters</a>
          </div>
        )}

        {!cursorError && <Pagination nextCursor={nextCursor} isContinuation={Boolean(cursor)} keyword={keyword} geo={geo} industry={industry} />}
      </section>

      <footer className="footer">
        <span>Listings link directly to their original source.</span>
        <a href="https://jobicy.com/" target="_blank" rel="noopener noreferrer">Jobs powered by Jobicy</a>
      </footer>
    </main>
  );
}
