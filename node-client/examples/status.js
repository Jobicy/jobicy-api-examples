import { JobicyClient } from "../src/index.js";

const ids = process.argv.slice(2).flatMap((value) => value.split(","));
if (!ids.length) {
  console.error("Usage: npm run example:status -- 123456,123457,123458");
  process.exitCode = 1;
} else {
  try {
    const statuses = await new JobicyClient().getJobStatuses(ids);
    for (const item of statuses) console.log(`${item.id}: ${item.status}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
