# Jobicy Make.com Scenario

Build a portable, account-safe Make scenario without a fabricated blueprint or account-specific module IDs.

## Scenario design

1. Make schedule: every **60 minutes** or less frequently.
2. **HTTP → Make a request**: fetch the public Jobicy API.
3. **Tools → Iterator**: iterate over the response's `jobs` array.
4. Connection filter: retain only relevant jobs.
5. **Data store → Check the existence of a record**: deduplicate on Jobicy job ID.
6. Filter: continue only when the record does not exist.
7. **Telegram Bot → Send a Text Message or Reply**, or **Slack → Create a Message**.
8. **Data store → Add/Replace a Record**: save the ID only after successful delivery.

## Configure the HTTP request

| Field | Value |
| --- | --- |
| Method | `GET` |
| URL | `https://jobicy.com/api/v2/remote-jobs` |
| Query string: `count` | `50` |
| Query string: `geo` | Optional valid slug, such as `usa` |
| Query string: `industry` | Optional valid slug, such as `engineering` |
| Query string: `tag` | Optional keyword, such as `python` |
| Header: `Accept` | `application/json` |
| Header: `User-Agent` | `Jobicy-Integration-Example/make` |
| Parse response | `Yes` |
| Timeout | `15` seconds |

Leave unwanted query-string fields out rather than inserting fake values. Run this module once so Make can discover the real response schema.

## Iterate and filter

Add **Tools → Iterator** and map its **Array** field to the HTTP module's parsed `jobs[]` collection. Each emitted bundle contains the real fields `id`, `url`, `jobTitle`, `companyName`, `jobGeo`, `jobIndustry[]`, `jobType[]`, `jobExcerpt`, `salaryMin`, `salaryMax`, `salaryCurrency`, and `salaryPeriod` when supplied.

Add a connection filter when needed. For a case-insensitive keyword match, compare `lower(jobTitle)` and `lower(jobExcerpt)` against your lowercase keyword with Make's **Contains** operator. Use the original `url` as the destination link.

## Persistent deduplication

Create a Make data store with a text key and optional `published_at` date field. Pass the iterator's `id` converted to text into **Check the existence of a record**. Continue only when the result is false. Add the record after the Telegram or Slack message succeeds. Apply a retention policy to keep the store bounded.

To avoid flooding a new channel, perform the first run with the destination module temporarily disabled and populate the data store from the current response. Enable message delivery only after this baseline is established.

## Telegram mapping

Create a Telegram Bot connection with a BotFather token, choose your target chat, and map a plain-text message:

```text
{{jobTitle}}
{{companyName}} · {{jobGeo}}
{{jobExcerpt}}

View job: {{url}}
Jobs powered by Jobicy: https://jobicy.com/
```

Add salary values only when supplied. Plain text avoids markup injection. Add the bot to a channel as an administrator before enabling the scenario.

## Slack mapping

Connect your Slack workspace, select a channel, and map the same fields into a message. Keep `url` as the original clickable Jobicy listing. Configure an error handler for failed HTTP requests, invalid response parsing, destination errors, and HTTP 429. Honor `Retry-After` when surfaced.

Make blueprints include internal module identifiers, account connections, and scenario-specific configuration. This repository intentionally supplies exact transferable settings instead of inventing an unverified blueprint that could not be imported safely.
