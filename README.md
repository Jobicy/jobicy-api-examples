# Jobicy Integration Examples

Production-ready examples for integrating Jobicy remote jobs into websites, applications, bots, workflows and AI agents.

[Jobicy](https://jobicy.com/) is a remote-work platform with a public remote jobs API, canonical job listings, an RSS feed, and an MCP jobs server. This repository contains self-contained integrations that preserve the original Jobicy job URL and attribution.

## Data sources

- [Jobs API](https://jobicy.com/api/v2/remote-jobs)
- [RSS feed](https://jobicy.com/jobs/feed)
- [MCP endpoint](https://jobicy.com/mcp)
- [Official API, RSS, and MCP documentation](https://jobicy.com/jobs-rss-feed)

The public jobs API accepts `count` from 1 through 100, plus optional `geo`, `industry`, and `tag` query parameters. Successful responses contain a `jobs` array. Discover valid current filter slugs with [`?get=locations`](https://jobicy.com/api/v2/remote-jobs?get=locations) and [`?get=industries`](https://jobicy.com/api/v2/remote-jobs?get=industries).

| Integration | Technology | Setup | Use case |
| --- | --- | --- | --- |
| [Telegram Bot](./telegram-bot/) | Node.js | Easy | Publish matching jobs to a Telegram channel |
| [Discord Bot](./discord-bot/) | Node.js, incoming webhook | Easy | Send new jobs to a Discord community |
| [Slack Bot](./slack-bot/) | Node.js, incoming webhook | Easy | Deliver formatted job alerts to Slack |
| [Next.js Job Board](./nextjs-job-board/) | Next.js, TypeScript | Intermediate | Build a responsive public job board |
| [WordPress Widget](./wordpress-widget/) | PHP, WordPress | Easy | Display cached Jobicy jobs with a shortcode |
| [Python Client](./python-client/) | Python | Easy | Search, filter, export, and summarize jobs |
| [Node Client](./node-client/) | Node.js | Easy | Consume the Jobicy API from JavaScript |
| [n8n Workflow](./n8n/) | n8n workflow JSON | Intermediate | Automate deduplicated Telegram job alerts |
| [Make Scenario](./make/) | Make.com | Intermediate | Create a scheduled no-code job workflow |
| [Zapier Workflows](./zapier/) | Zapier, JavaScript | Easy | Route RSS or API jobs into connected apps |
| [MCP Agent](./mcp-agent/) | Node.js, official MCP SDK | Intermediate | Connect AI assistants to live Jobicy jobs |

## What can you build?

- A remote job board for a specific community or geography.
- A Telegram jobs bot publishing to a focused job channel.
- Discord jobs bot notifications for a professional community.
- A Slack jobs integration for hiring teams and internal channels.
- A niche job newsletter with curated remote roles.
- An internal recruiting tool for discovering relevant openings.
- A career application that complements canonical Jobicy listings.
- An AI job search assistant backed by the Jobicy MCP server.
- A job analytics tool using the remote work API.
- An n8n jobs automation, Make scenario, or Zapier workflow.

## Clone and start

```bash
git clone https://github.com/jobicy/jobicy-integration-examples.git
cd jobicy-integration-examples
```

Every directory is independent. Open its README and run the documented setup from inside that directory. Node.js examples require Node.js 20.12 or newer; the Next.js job board requires Node.js 20.9 or newer; the Python jobs API client requires Python 3.10 or newer.

```bash
cd node-client
npm install
npm run example:search
```

```bash
cd python-client
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python examples/search_jobs.py
```

## Response fields

The remote job API returns Jobicy-owned field names: `id`, `url`, `jobSlug`, `jobTitle`, `companyName`, `companyLogo`, `jobIndustry`, `jobType`, `jobGeo`, `jobLevel`, `jobExcerpt`, `jobDescription`, `pubDate`, `salaryMin`, `salaryMax`, `salaryCurrency`, and `salaryPeriod`. Optional values may be absent. `jobIndustry` and `jobType` are arrays. Descriptions may contain HTML and must never be inserted as trusted markup.

## Attribution and original applications

Display **[Jobs powered by Jobicy](https://jobicy.com/)** in public interfaces and keep every listing linked to the original `url` returned by the Jobicy API. Do not replace application destinations, represent listings as your own, or republish full descriptions on duplicate public job pages.

## Rate limits and responsible use

Request no more than 100 jobs, filter server-side when possible, cache results, deduplicate job IDs, and back off when receiving HTTP 429. The bot examples expose the requested five-minute development interval and enforce a 60-second technical minimum. Current published Jobicy fair-use guidance says automated production checks must not run more frequently than once per hour: set `CHECK_INTERVAL_SECONDS=3600` or greater before enabling a public deployment. RSS polling must likewise be hourly or less frequent. WordPress caches successful responses for one hour; the Next.js board revalidates hourly; the n8n workflow runs hourly.

## Security

Keep tokens and webhook URLs in an untracked `.env` file, never in a commit. Validate destination webhook hosts, use HTTPS, escape job content before sending or rendering it, sanitize API output, apply request timeouts, and rotate any exposed credentials immediately. Report vulnerabilities through the process in [SECURITY.md](./SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), then submit a focused pull request. New remote jobs API, job board API, Node.js jobs API, Next.js job board, or AI-agent integrations should use public Jobicy interfaces and respect fair-use guidance.

## Documentation and license

Complete Jobicy API, feed, filter, and MCP documentation is available at [jobicy.com/jobs-rss-feed](https://jobicy.com/jobs-rss-feed). Source code is available under the [MIT License](./LICENSE).

## Recommended GitHub topics

`jobicy` · `remote-jobs` · `remote-work` · `jobs-api` · `job-board` · `telegram-bot` · `discord-bot` · `slack` · `nextjs` · `python` · `nodejs` · `n8n` · `mcp` · `ai-agents` · `developer-tools`
