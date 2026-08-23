import { formatPublicationDate, formatSalary, readableText } from "@/lib/jobicy";
import type { JobicyJob } from "@/types/job";

export default function JobCard({ job }: { job: JobicyJob }) {
  const title = readableText(job.jobTitle) || "Remote opportunity";
  const company = readableText(job.companyName) || "Company not specified";
  const location = readableText(job.jobGeo) || "Location not specified";
  const salary = formatSalary(job);
  const published = formatPublicationDate(job.pubDate);
  const industry = Array.isArray(job.jobIndustry) ? job.jobIndustry.map(readableText).filter(Boolean) : [];
  const jobType = Array.isArray(job.jobType) ? job.jobType.map(readableText).filter(Boolean) : [];
  const excerpt = readableText(job.jobExcerpt);
  const logo = typeof job.companyLogo === "string" && /^https:\/\//i.test(job.companyLogo)
    ? job.companyLogo
    : "";

  return (
    <article className="job-card">
      <div className="job-card__top">
        <div className="job-card__identity">
          {logo ? (
            <img className="job-card__logo" src={logo} alt="" width={46} height={46} loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span className="job-card__monogram" aria-hidden="true">{company.slice(0, 1).toUpperCase()}</span>
          )}
          <div>
            <h2 className="job-card__title">
              <a href={job.url} target="_blank" rel="noopener noreferrer">{title}</a>
            </h2>
            <p className="job-card__company">{company}</p>
          </div>
        </div>
        {published && <time className="job-card__date" dateTime={job.pubDate}>{published}</time>}
      </div>

      <div className="job-card__details">
        <span>{location}</span>
        {jobType.map((type) => <span key={type}>{type}</span>)}
        {industry.slice(0, 2).map((category) => <span key={category}>{category}</span>)}
      </div>

      {excerpt && <p className="job-card__excerpt">{excerpt}</p>}

      <div className="job-card__bottom">
        <span className="job-card__salary">{salary || "Compensation not listed"}</span>
        <a className="job-card__link" href={job.url} target="_blank" rel="noopener noreferrer">View on Jobicy →</a>
      </div>
    </article>
  );
}
