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

The supplied development interval is 300 seconds, with a technical minimum of 60 seconds. Jobicy's published production fair-use guidance requires no more than one automated request per hour: set `CHECK_INTERVAL_SECONDS=3600` or greater before enabling a deployed bot.

On the first successful API request, the bot records current matching job IDs without publishing them. Later polls publish only newly appearing listings. State is stored in `data/seen-jobs.json`, survives restarts, is limited to 2,000 IDs, and is rebuilt safely if corrupt. Failed Telegram deliveries are not marked as sent and will be retried on a later check.

Messages use escaped Telegram HTML, preserve the original Jobicy listing URL, and include a discreet Jobicy attribution link.
