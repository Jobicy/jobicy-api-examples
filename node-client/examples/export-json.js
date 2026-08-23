import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { JobicyClient } from "../src/index.js";

const output = path.resolve(process.argv[2] || "jobs.json");

try {
  const jobs = await new JobicyClient().getJobs({ count: 50 });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify({ source: "https://jobicy.com/", exportedAt: new Date().toISOString(), jobs }, null, 2)}\n`, "utf8");
  console.log(`Exported ${jobs.length} Jobicy jobs to ${output}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
