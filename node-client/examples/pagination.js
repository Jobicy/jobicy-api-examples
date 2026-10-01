import { JobicyClient } from "../src/index.js";

try {
  const client = new JobicyClient();
  let total = 0;
  for await (const job of client.iterJobs({ count: 100 })) {
    console.log(`${job.jobTitle || "Remote opportunity"} — ${job.url}`);
    total += 1;
  }
  console.log(`\n${total} jobs from the available seven-day feed. Jobs powered by https://jobicy.com/`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
