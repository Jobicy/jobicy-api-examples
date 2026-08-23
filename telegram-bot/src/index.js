import { fileURLToPath } from "node:url";
import path from "node:path";
import { fetchJobs } from "./jobicy.js";
import { formatJob } from "./formatter.js";
import { SeenJobStore } from "./storage.js";
import { sendTelegramMessage } from "./telegram.js";

try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const chatId = (process.env.TELEGRAM_CHAT_ID || "").trim();

if (!token || !chatId) {
  console.error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env before starting the bot.");
  process.exit(1);
}

const rawInterval = Number.parseInt(process.env.CHECK_INTERVAL_SECONDS || "300", 10);
const intervalSeconds = Math.max(60, Number.isFinite(rawInterval) ? rawInterval : 300);
const directory = path.dirname(fileURLToPath(import.meta.url));
const store = new SeenJobStore(path.join(directory, "..", "data", "seen-jobs.json"));
let timer;
let stopping = false;

async function checkJobs() {
  const jobs = await fetchJobs({
    geo: process.env.JOBICY_GEO || "",
    industry: process.env.JOBICY_INDUSTRY || "",
    keywords: process.env.JOBICY_KEYWORDS || "",
    project: "telegram-bot"
  });

  if (!store.initialized) {
    await store.baseline(jobs);
    console.log(`Initialized baseline with ${jobs.length} existing jobs; only new jobs will be published.`);
    return;
  }

  const unseen = jobs.filter((job) => !store.has(job.id)).reverse();

  for (const job of unseen) {
    await sendTelegramMessage({ token, chatId, message: formatJob(job) });
    await store.remember(job.id);
    console.log(`Published job ${job.id}: ${job.jobTitle || "Untitled"}`);
  }

  if (!unseen.length) console.log(`Checked ${jobs.length} jobs; nothing new.`);
}

async function run() {
  if (stopping) return;

  let delaySeconds = intervalSeconds;

  try {
    await checkJobs();
  } catch (error) {
    console.error(error.message);
    if (error.status === 429) delaySeconds = Math.max(intervalSeconds, error.retryAfterSeconds || 3600);
  }

  if (!stopping) timer = setTimeout(run, delaySeconds * 1000);
}

function stop() {
  stopping = true;
  clearTimeout(timer);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await store.load();
console.log(`Jobicy Telegram bot started; checking every ${intervalSeconds} seconds.`);
await run();
