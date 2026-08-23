import { formatSalary, normalizeText } from "./jobicy.js";

function validateWebhook(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("SLACK_WEBHOOK_URL must be a valid HTTPS URL");
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "hooks.slack.com" || !parsed.pathname.startsWith("/services/")) {
    throw new Error("SLACK_WEBHOOK_URL must point to an official Slack incoming webhook");
  }

  return parsed;
}

function escapeMrkdwn(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendSlackJob(webhookUrl, job) {
  const endpoint = validateWebhook(webhookUrl);
  const title = normalizeText(job.jobTitle || "Remote opportunity", 150);
  const company = normalizeText(job.companyName || "Not specified", 120);
  const location = normalizeText(job.jobGeo || "Not specified", 120);
  const salary = formatSalary(job);
  const excerpt = normalizeText(job.jobExcerpt, 700);
  const fields = [
    { type: "mrkdwn", text: `*Company*\n${escapeMrkdwn(company)}` },
    { type: "mrkdwn", text: `*Location*\n${escapeMrkdwn(location)}` }
  ];

  if (salary) fields.push({ type: "mrkdwn", text: `*Salary*\n${escapeMrkdwn(salary)}` });

  const blocks = [
    { type: "header", text: { type: "plain_text", text: title, emoji: false } },
    { type: "section", fields },
    ...(excerpt ? [{ type: "section", text: { type: "plain_text", text: excerpt, emoji: false } }] : []),
    {
      type: "actions",
      elements: [{ type: "button", text: { type: "plain_text", text: "View Job", emoji: false }, url: job.url }]
    },
    { type: "context", elements: [{ type: "mrkdwn", text: "<https://jobicy.com/|Jobs powered by Jobicy>" }] }
  ];

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `${title} at ${company} — ${job.url}`, blocks }),
      signal: AbortSignal.timeout(15_000)
    });
  } catch (error) {
    throw new Error(`Slack request failed: ${error.message}`);
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Slack webhook returned HTTP ${response.status}${details ? `: ${details.slice(0, 300)}` : ""}`);
  }
}
