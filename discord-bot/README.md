# Jobicy Discord Bot

Send new remote jobs to a Discord channel through an official incoming webhook. No Discord Gateway bot or privileged intents are required.

## Create a webhook

1. Open the target Discord channel's settings.
2. Choose **Integrations → Webhooks → New Webhook**.
3. Select the destination channel and copy the webhook URL.
4. Keep the URL private: possession of the URL allows posting to that channel.

```bash
cd discord-bot
cp .env.example .env
npm install
npm start
```

Set `DISCORD_WEBHOOK_URL` in `.env`. Optionally configure official `JOBICY_GEO` and `JOBICY_INDUSTRY` slugs, plus comma-separated case-insensitive `JOBICY_KEYWORDS`.

The default and minimum synchronization interval is one hour (`CHECK_INTERVAL_SECONDS=3600`). Each pass requests pages of 100 jobs using `nextCursor` until the seven-day feed is exhausted. Filters remain fixed within a pass. HTTP 429 responses extend the delay using `Retry-After` when available; failed traversals are retried from the first page on a later pass.

The first successful full traversal establishes a silent baseline. New jobs discovered afterward are posted as Discord embeds with title, company, location, optional salary, optional employer logo, description, original Jobicy URL, and attribution. Previously posted IDs from the current matching seven-day feed persist in `data/seen-jobs.json`. A corrupt state file rebuilds the baseline rather than replaying old jobs.

IDs are pruned only after a successful full traversal, avoiding duplicates caused by a fixed ID-count cap. If you change filters and want a new silent baseline, stop the bot and remove its state file before restarting. Cursors are used only during a pass, expire after 24 hours, and are never stored as a long-term polling checkpoint.

[OpenAPI JSON](https://jobicy.com/api/openapi.json) · [OpenAPI YAML](https://jobicy.com/api/openapi.yaml)
