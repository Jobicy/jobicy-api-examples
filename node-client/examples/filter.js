import { JobicyClient, formatSalary } from "../src/index.js";

const keywords = process.argv.slice(2).join(" ").split(",").map((term) => term.trim().toLowerCase()).filter(Boolean);
const activeKeywords = keywords.length ? keywords : ["python", "backend"];

try {
  const jobs = await new JobicyClient().getJobs({ count: 100 });
  const matches = jobs.filter((job) => {
    const text = [job.jobTitle, job.companyName, job.jobExcerpt, ...(Array.isArray(job.jobIndustry) ? job.jobIndustry : [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return activeKeywords.some((keyword) => text.includes(keyword));
  });

  if (!matches.length) console.log(`No jobs matched: ${activeKeywords.join(", ")}`);

  for (const job of matches) {
    console.log(`${job.jobTitle || "Remote opportunity"} — ${job.companyName || "Company not specified"}`);
    if (formatSalary(job)) console.log(formatSalary(job));
    console.log(job.url);
  }

  console.log(`\n${matches.length} matching jobs. Jobs powered by https://jobicy.com/`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
