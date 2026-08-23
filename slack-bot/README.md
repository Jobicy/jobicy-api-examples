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

Existing jobs are recorded silently during the initial successful request. Later requests publish only new IDs. Persistent state is bounded to 2,000 entries and survives process restarts. Failed posts remain eligible for a future retry.

The development polling default is 300 seconds, with a 60-second technical floor. Set `CHECK_INTERVAL_SECONDS=3600` or greater in production to comply with Jobicy's published automated-request guidance.
