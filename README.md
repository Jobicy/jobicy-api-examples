# Jobicy API Examples — Remote Jobs API, RSS & MCP Integrations

Production-ready examples for integrating Jobicy remote jobs into websites, applications, bots, workflows and AI agents.

[Jobicy](https://jobicy.com/) is a remote-work platform with a public remote jobs API, canonical job listings, an RSS feed, and an MCP jobs server. This repository contains self-contained integrations that preserve the original Jobicy job URL and attribution.

## Data sources

- [Jobs API](https://jobicy.com/api/v2/remote-jobs)
- [OpenAPI JSON](https://jobicy.com/api/openapi.json) · [OpenAPI YAML](https://jobicy.com/api/openapi.yaml)
- [RSS feed](https://jobicy.com/jobs/feed)
- [MCP endpoint](https://jobicy.com/mcp)
- [Official API, RSS, and MCP documentation](https://jobicy.com/jobs-rss-feed)

The public jobs API accepts `count` from 1 through 200, plus optional `geo`, `industry`, `tag`, and `cursor` query parameters. The server default is 200; these examples request smaller pages explicitly. Successful responses contain a `jobs` array. Discover valid current filter slugs with [`?get=locations`](https://jobicy.com/api/v2/remote-jobs?get=locations) and [`?get=industries`](https://jobicy.com/api/v2/remote-jobs?get=industries).

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
git clone https://github.com/Jobicy/jobicy-api-examples.git
cd jobicy-api-examples
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

## Cursor pagination

The REST feed contains jobs published within the last **seven days**, newest first. `count` is a page size, not a limit on the entire feed. There is no separate 1,000-job cap.

1. Start with no `cursor`, for example `?count=100&geo=usa`.
2. Process the `jobs` array and read `nextCursor` and `hasMore`.
3. When `nextCursor` is a string, pass it unchanged as `cursor` in the next request. Use URL encoding and retain the same `geo`, `industry`, and `tag` filters.
4. Stop when `nextCursor` is `null` and `hasMore` is `false`. Do not stop just because a page is short or local filtering produced no matches.

Treat the cursor as opaque. It expires 24 hours after a traversal starts. HTTP 400 for an expired, invalid, or filter-mismatched cursor requires a fresh traversal without a cursor; retain delivered job IDs to avoid reposting. New jobs published after a traversal starts appear in a subsequent fresh traversal. The seven-day lower boundary keeps moving, so this feed is not an archival export.

Node.js and Python provide page methods and full-feed iterators. Bots traverse all pages before establishing a baseline or delivering jobs. The Next.js board requests one page for each navigation. The WordPress widget intentionally displays only a limited set of recent jobs. REST pagination does not imply cursor support in RSS or MCP tools.

## Response fields

The remote job API returns Jobicy-owned field names: `id`, `url`, `jobSlug`, `jobTitle`, `companyName`, `companyLogo`, `jobIndustry`, `jobType`, `jobGeo`, `jobLevel`, `jobExcerpt`, `jobDescription`, `pubDate`, `salaryMin`, `salaryMax`, `salaryCurrency`, and `salaryPeriod`. The response envelope includes `jobCount` (this page only), `lastUpdate`, `nextCursor`, and `hasMore`; it does not provide a total page count. Optional job values may be absent; `companyLogo` can be `false`. `jobIndustry` and `jobType` are arrays. Descriptions may contain HTML and must never be inserted as trusted markup.

## Attribution and original applications

Display **[Jobs powered by Jobicy](https://jobicy.com/)** in public interfaces and keep every listing linked to the original `url` returned by the Jobicy API. Do not replace application destinations, represent listings as your own, or republish full descriptions on duplicate public job pages.

## Rate limits and responsible use

Request no more than 200 jobs per page, filter server-side when possible, cache results, deduplicate job IDs, and back off when receiving HTTP 429. Start a new automated synchronization no more frequently than once per hour; consecutive cursor requests belong to the same synchronization. Bots default to `CHECK_INTERVAL_SECONDS=3600` and clamp shorter intervals to one hour. RSS polling must likewise be hourly or less frequent. WordPress caches successful responses for one hour; the Next.js board revalidates hourly; the n8n workflow runs hourly.

## Check the examples

```bash
node --test tests/pagination.test.mjs
python3 -m unittest discover -s tests -p 'test_python_pagination.py'
```

The Python check requires `python-client/requirements.txt`. These checks use mocked API responses and temporary bot state; they do not publish messages. Run the per-directory checks and the Next.js typecheck/build as described in each README.

## Related Jobicy developer resources

- [Jobicy Remote Jobs API](https://github.com/Jobicy/remote-jobs-api) — official documentation and examples for the public Jobicy Remote Jobs API and RSS feeds.
- [Jobicy Remote Jobs MCP Server](https://github.com/Jobicy/remote-jobs-mcp-server) — MCP server for connecting AI assistants and agents to live remote jobs from Jobicy.
- [Jobicy API, RSS & MCP Documentation](https://jobicy.com/jobs-rss-feed) — complete documentation for API endpoints, filters, RSS feeds, and MCP access.

## Security

Keep tokens and webhook URLs in an untracked `.env` file, never in a commit. Validate destination webhook hosts, use HTTPS, escape job content before sending or rendering it, sanitize API output, apply request timeouts, and rotate any exposed credentials immediately. Report vulnerabilities through the process in [SECURITY.md](./SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), then submit a focused pull request. New remote jobs API, job board API, Node.js jobs API, Next.js job board, or AI-agent integrations should use public Jobicy interfaces and respect fair-use guidance.

## Documentation and license

Complete Jobicy API, feed, filter, and MCP documentation is available at [jobicy.com/jobs-rss-feed](https://jobicy.com/jobs-rss-feed). Source code is available under the [MIT License](./LICENSE).
