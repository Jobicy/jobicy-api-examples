# Jobicy Slack Integration

Deliver newly discovered remote jobs to Slack using an official incoming webhook and Block Kit.

## Create a Slack incoming webhook

1. Create or open a Slack app at [api.slack.com/apps](https://api.slack.com/apps).
2. Enable **Incoming Webhooks**.
3. Choose **Add New Webhook to Workspace** and select a channel.
4. Copy the resulting `hooks.slack.com/services/...` URL into `.env`.

```bash
cd slack-bot
cp .env.example .env
npm install
npm start
```

Set `SLACK_WEBHOOK_URL`. Use `JOBICY_GEO` and `JOBICY_INDUSTRY` for server-side filtering and `JOBICY_KEYWORDS` for case-insensitive comma-separated matches.

Messages use a Block Kit header, company and location fields, optional compensation, a plain-text excerpt, a **View Job** button pointing to the canonical Jobicy listing, and a linked Jobicy attribution line.

Existing jobs are recorded silently during the initial successful full traversal. Later requests publish only new IDs. Persistent state is bounded by the current matching seven-day feed and survives process restarts. Failed posts remain eligible for a future retry.

The default and minimum synchronization interval is one hour (`CHECK_INTERVAL_SECONDS=3600`). Each pass requests pages of 100 jobs using `nextCursor` until the seven-day feed is exhausted. Filters remain fixed within a pass. HTTP 429 responses extend the delay using `Retry-After` when available; failed traversals are retried from the first page on a later pass.

IDs are pruned only after a successful full traversal, avoiding duplicates caused by a fixed ID-count cap. If you change filters and want a new silent baseline, stop the bot and remove its state file before restarting. Cursors are used only during a pass, expire after 24 hours, and are never stored as a long-term polling checkpoint.

[OpenAPI JSON](https://jobicy.com/api/openapi.json) · [OpenAPI YAML](https://jobicy.com/api/openapi.yaml)

## Stored listings

If you extend this integration to retain listings, use the [batch status endpoint](../README.md#check-stored-job-statuses) to check up to 100 IDs at a time. Older open jobs can remain `active` after leaving the seven-day feed. Do not mark jobs closed just because a fresh feed omits them, or because a check returns `unknown` or fails. The sample does not automatically reconcile stored listings.
