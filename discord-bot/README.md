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

The bundled development default is 300 seconds; values below 60 seconds are clamped. Set `CHECK_INTERVAL_SECONDS=3600` or greater for production to follow current Jobicy fair-use guidance. HTTP 429 responses extend the delay using `Retry-After` when available.

The first successful request establishes a silent baseline. New jobs discovered afterward are posted as Discord embeds with title, company, location, optional salary, optional employer logo, description, original Jobicy URL, and attribution. Up to 2,000 previously posted IDs persist in `data/seen-jobs.json`. A corrupt state file rebuilds the baseline rather than replaying old jobs.
