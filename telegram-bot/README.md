# Jobicy Telegram Bot

Publish new matching remote jobs to a Telegram channel without reposting existing listings.

## Requirements

Node.js 20.12+, a Telegram account, a Telegram bot, and a channel or chat.

## Create and configure the bot

1. In Telegram, open [@BotFather](https://t.me/BotFather), send `/newbot`, and follow the prompts.
2. Copy the token BotFather returns.
3. Create or open your Telegram channel and add the bot as an administrator allowed to post messages.
4. Use a public channel username such as `@your_channel` as `TELEGRAM_CHAT_ID`. For a private channel, retrieve its numeric chat ID from a bot update after adding the bot and posting a message.

```bash
cd telegram-bot
cp .env.example .env
npm install
npm start
```

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`. Optional `JOBICY_GEO` and `JOBICY_INDUSTRY` use the official Jobicy slugs. `JOBICY_KEYWORDS` accepts comma-separated case-insensitive alternatives, for example `python,backend,platform`.

The default and minimum synchronization interval is one hour (`CHECK_INTERVAL_SECONDS=3600`). Each pass requests pages of 100 jobs using `nextCursor` until the seven-day feed is exhausted. Filters remain fixed within a pass. HTTP 429 responses extend the delay using `Retry-After` when available; failed traversals are retried from the first page on a later pass.

On the first successful full traversal, the bot records current matching job IDs without publishing them. Later polls publish only newly appearing listings. State is stored in `data/seen-jobs.json`, survives restarts, retains IDs belonging to the current matching seven-day feed, and is rebuilt safely if corrupt. Failed Telegram deliveries are not marked as sent and will be retried on a later check.

Messages use escaped Telegram HTML, preserve the original Jobicy listing URL, and include a discreet Jobicy attribution link.

IDs are pruned only after a successful full traversal, avoiding duplicates caused by a fixed ID-count cap. If you change filters and want a new silent baseline, stop the bot and remove its state file before restarting. Cursors are used only during a pass, expire after 24 hours, and are never stored as a long-term polling checkpoint.

[OpenAPI JSON](https://jobicy.com/api/openapi.json) · [OpenAPI YAML](https://jobicy.com/api/openapi.yaml)

## Stored listings

If you extend this integration to retain listings, use the [batch status endpoint](../README.md#check-stored-job-statuses) to check up to 100 IDs at a time. Older open jobs can remain `active` after leaving the seven-day feed. Do not mark jobs closed just because a fresh feed omits them, or because a check returns `unknown` or fails. The sample does not automatically reconcile stored listings.
