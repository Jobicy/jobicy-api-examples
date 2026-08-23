import { formatSalary, normalizeText } from "./jobicy.js";

function validateWebhook(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DISCORD_WEBHOOK_URL must be a valid HTTPS URL");
  }

  const allowedHosts = new Set(["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"]);

  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname) || !parsed.pathname.startsWith("/api/webhooks/")) {
    throw new Error("DISCORD_WEBHOOK_URL must point to an official Discord incoming webhook");
  }

  return parsed;
}

export async function sendDiscordJob(webhookUrl, job) {
  const endpoint = validateWebhook(webhookUrl);
  const salary = formatSalary(job);
  const fields = [
    { name: "Company", value: normalizeText(job.companyName || "Not specified", 200), inline: true },
    { name: "Location", value: normalizeText(job.jobGeo || "Not specified", 200), inline: true }
  ];

  if (salary) fields.push({ name: "Salary", value: salary, inline: false });

  const embed = {
    title: normalizeText(job.jobTitle || "Remote opportunity", 250),
    url: job.url,
    description: normalizeText(job.jobExcerpt, 800) || "Open the original Jobicy listing for full details.",
    color: 16163504,
    fields,
    footer: { text: "Jobs powered by Jobicy · https://jobicy.com/" }
  };

  if (typeof job.companyLogo === "string" && /^https:\/\//i.test(job.companyLogo)) {
    embed.thumbnail = { url: job.companyLogo };
  }

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Jobicy Jobs", embeds: [embed], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(15_000)
    });
  } catch (error) {
    throw new Error(`Discord request failed: ${error.message}`);
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Discord webhook returned HTTP ${response.status}${details ? `: ${details.slice(0, 300)}` : ""}`);
  }
}
