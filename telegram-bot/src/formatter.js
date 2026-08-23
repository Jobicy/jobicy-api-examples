import { formatSalary, normalizeText } from "./jobicy.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatJob(job) {
  const title = escapeHtml(normalizeText(job.jobTitle || "Remote opportunity", 180));
  const company = escapeHtml(normalizeText(job.companyName || "Company not specified", 120));
  const location = escapeHtml(normalizeText(job.jobGeo || "Location not specified", 140));
  const salary = formatSalary(job);
  const excerpt = escapeHtml(normalizeText(job.jobExcerpt, 420));
  const url = escapeHtml(job.url);
  const lines = [
    `<b>${title}</b>`,
    `Company: ${company}`,
    `Location: ${location}`
  ];

  if (salary) lines.push(`Salary: ${escapeHtml(salary)}`);
  if (excerpt) lines.push("", excerpt);

  lines.push("", `<a href="${url}">View job on Jobicy</a>`, '<a href="https://jobicy.com/">Jobs powered by Jobicy</a>');

  return lines.join("\n");
}
