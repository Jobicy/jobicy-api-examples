# Jobicy n8n Telegram Workflow

Importable n8n workflow: hourly schedule → configure filters → Jobicy HTTP request → extract jobs → keyword filter → persistent deduplication → Telegram.

## Import and configure

1. In n8n, create or open a workflow and choose **Import from File**.
2. Select `jobicy-telegram-workflow.json`.
3. Open **Configure filters** and set optional `geo`, `industry`, and comma-separated `keywords`. Keep `count` between 1 and 200 per page (default 100).
4. Create a Telegram credential using your BotFather token and select it in **Send Telegram message**.
5. Set the `JOBICY_TELEGRAM_CHAT_ID` environment variable for your n8n deployment to the target numeric chat ID or public `@channel` handle. If environment access is disabled on your instance, replace the Chat ID expression in the Telegram node with the channel value directly.
6. Add the bot as a channel administrator with posting permission.
7. Publish or activate the workflow so its hourly trigger can run.

The workflow intentionally contains no fake or account-specific credential IDs. Telegram credentials must be chosen in your own n8n account after import.

## First run and persistent state

The first successful scheduled execution records current matching Jobicy IDs without sending a backlog. Later scheduled executions send only newly seen listings. IDs from the current matching seven-day feed are retained using n8n workflow static data; a fixed count cap cannot discard still-visible IDs. n8n persists static data only for active trigger-driven executions; clicking a manual test run does not provide reliable persistence.

## Cursor pagination

The HTTP Request node uses built-in pagination to construct each next request with the response's `nextCursor` and unchanged filters. It stops when the cursor is absent. **Extract jobs** validates pagination metadata, combines every response page, and deduplicates job IDs before local filtering or baseline creation. It does not stop on an empty jobs array if a next cursor exists.

A safety ceiling of 100 requests per execution prevents runaway pagination. If the final fetched page still has a cursor, extraction fails before baseline or delivery; increase `maxRequests` for a larger feed and retry. This is a workflow safeguard, not a Jobicy feed-size limit. An HTTP 400 or 429 fails the execution; the next scheduled execution starts a fresh traversal. Do not use a cursor as a permanent checkpoint: it expires after 24 hours.

Static data is saved only after a successful active workflow execution. If delivery partially succeeds and the execution then fails, those messages can repeat on retry. Use an external durable store with an ID recorded after each delivery when you need to limit such retries. Reset static data when changing filters if you want a fresh silent baseline.

[OpenAPI JSON](https://jobicy.com/api/openapi.json) · [OpenAPI YAML](https://jobicy.com/api/openapi.yaml)

The HTTP request uses the real Jobicy endpoint, documented filters, a 15-second timeout, and a project User-Agent. Each outgoing message escapes Telegram HTML and links to the canonical Jobicy URL. The default one-hour schedule follows Jobicy's published fair-use guidance.

If no matching jobs exist, downstream nodes do not run. Network and HTTP errors fail the execution visibly in n8n rather than generating fabricated job data.

## Stored listings

If you extend this integration to retain listings, use the [batch status endpoint](../README.md#check-stored-job-statuses) to check up to 100 IDs at a time. Older open jobs can remain `active` after leaving the seven-day feed. Do not mark jobs closed just because a fresh feed omits them, or because a check returns `unknown` or fails. The sample does not automatically reconcile stored listings.
