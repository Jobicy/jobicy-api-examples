# Jobicy Zapier Workflows

Two practical ways to route real Jobicy listings into Telegram, Slack, Discord, email, or another Zapier destination.

## Scenario 1: RSS by Zapier

1. Add **RSS by Zapier → New Item in Feed**.
2. Set the feed URL to `https://jobicy.com/jobs/feed`.
3. Choose an hourly or less frequent polling schedule where your Zapier plan permits it.
4. Add **Filter by Zapier** to match the feed title or content against your target keyword.
5. Add a destination such as **Telegram → Send Message**, **Slack → Send Channel Message**, **Discord → Send Channel Message**, or an email action.
6. Map the feed title, excerpt, and original Jobicy item URL into the outgoing message.
7. Include `Jobs powered by Jobicy — https://jobicy.com/`.

Zapier's RSS trigger handles new feed items and deduplication. Avoid feed configurations that poll more often than Jobicy's published hourly guidance.

## Scenario 2: scheduled API request

1. Add **Schedule by Zapier** and run once per hour or less often.
2. Add **Webhooks by Zapier → GET**.
3. Set the URL to `https://jobicy.com/api/v2/remote-jobs`.
4. Add query-string parameters `count=50` and optional `geo`, `industry`, or `tag` filters.
5. Set an `Accept: application/json` header.
6. Add **Looping by Zapier → Create Loop From Line Items** using the response's `jobs` array fields.
7. Add **Storage by Zapier → Get Value** with a key derived from the canonical Jobicy `id`.
8. Add **Filter by Zapier** so the Zap continues only when that ID has not already been stored and your content rules match.
9. Send the job to Telegram, Slack, Discord, email, or another destination.
10. Add **Storage by Zapier → Set Value** after the destination succeeds.

To avoid publishing old jobs after setup, establish your initial ID baseline before enabling the destination step.

## Optional Code by Zapier step

For local keyword filtering, canonical URL validation, duplicate removal, and normalized line-item output, use **Code by Zapier → Run JavaScript** instead of the Webhooks step:

1. Create input fields named `count`, `geo`, `industry`, `tag`, `keywords`, and optional `cursor`.
2. Use values such as `50`, `usa`, `engineering`, `python`, and `backend,platform`; leave optional fields blank.
3. Paste the complete contents of `code-step.js` into the JavaScript editor.
4. Map `ids`, `titles`, `companies`, `locations`, `excerpts`, and `urls` into **Looping by Zapier**.
5. Use Storage by Zapier to persist sent IDs, then publish to the destination.

## Cursor continuation

Both the Webhooks step and `code-step.js` request **one API page** per invocation; looping over jobs is not pagination. Counts range from 1 to 200 per page. The code returns `nextCursor` (an empty string when complete) and `hasMore` along with the normalized jobs. It passes a supplied cursor unchanged using URL encoding and continues exposing the cursor even when local filtering finds no matches.

For complete seven-day synchronization, configure an orchestrated continuation that invokes the request step again with `nextCursor` and the same filters until `hasMore` is false. Advance a stored continuation only after processing the current page, retain delivered IDs separately, and clear the cursor at completion. Establish a silent baseline across all pages before enabling delivery. Keep traversal guards and Zapier task/time limits in mind; this example deliberately does not run an unbounded fetch loop inside a Code step. For an importable full-feed workflow, use [n8n](../n8n/), or use the [Node client](../node-client/) in a backend.

Start new traversals hourly or less often. A cursor expires after 24 hours; on HTTP 400 restart without it while retaining delivered IDs. HTTP 429 requires deferred retry. Retain IDs while their jobs remain in the seven-day window to avoid reposting jobs dropped by a fixed count cap.

[OpenAPI JSON](https://jobicy.com/api/openapi.json) · [OpenAPI YAML](https://jobicy.com/api/openapi.yaml)

The code performs a real HTTP request, validates the `jobs` array, rejects non-Jobicy URLs, handles malformed JSON and HTTP failures, and does not fabricate API data. Keep webhook URLs, destination tokens, and account connections in Zapier's secret or connection settings.
