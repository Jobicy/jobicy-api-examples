# Jobicy n8n Telegram Workflow

Importable n8n workflow: hourly schedule → configure filters → Jobicy HTTP request → extract jobs → keyword filter → persistent deduplication → Telegram.

## Import and configure

1. In n8n, create or open a workflow and choose **Import from File**.
2. Select `jobicy-telegram-workflow.json`.
3. Open **Configure filters** and set optional `geo`, `industry`, and comma-separated `keywords`. Keep `count` between 1 and 100.
4. Create a Telegram credential using your BotFather token and select it in **Send Telegram message**.
5. Set the `JOBICY_TELEGRAM_CHAT_ID` environment variable for your n8n deployment to the target numeric chat ID or public `@channel` handle. If environment access is disabled on your instance, replace the Chat ID expression in the Telegram node with the channel value directly.
6. Add the bot as a channel administrator with posting permission.
7. Publish or activate the workflow so its hourly trigger can run.

The workflow intentionally contains no fake or account-specific credential IDs. Telegram credentials must be chosen in your own n8n account after import.

## First run and persistent state

The first successful scheduled execution records current matching Jobicy IDs without sending a backlog. Later scheduled executions send only newly seen listings. Up to 2,000 IDs are retained using n8n workflow static data. n8n persists static data only for active trigger-driven executions; clicking a manual test run does not provide reliable persistence.

The HTTP request uses the real Jobicy endpoint, documented filters, a 15-second timeout, and a project User-Agent. Each outgoing message escapes Telegram HTML and links to the canonical Jobicy URL. The default one-hour schedule follows Jobicy's published fair-use guidance.

If no matching jobs exist, downstream nodes do not run. Network and HTTP errors fail the execution visibly in n8n rather than generating fabricated job data.
