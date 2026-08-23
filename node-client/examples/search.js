import { JobicyClient, formatSalary } from "../src/index.js";

try {
  const jobicy = new JobicyClient();
  const jobs = await jobicy.getJobs({ count: 20, geo: "usa", industry: "engineering" });

  if (!jobs.length) {
    console.log("No matching remote jobs found.");
  }

  for (const job of jobs) {
    const salary = formatSalary(job);
    console.log(`${job.jobTitle || "Remote opportunity"} — ${job.companyName || "Company not specified"}`);
    console.log(`${job.jobGeo || "Location not specified"}${salary ? ` | ${salary}` : ""}`);
    console.log(`${job.url}\n`);
  }

  console.log(`Jobs powered by Jobicy — https://jobicy.com/`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
