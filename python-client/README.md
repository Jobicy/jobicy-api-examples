# Jobicy Python Client

A reusable typed Python client for the public Jobicy remote jobs API, plus runnable search, CSV export, salary filtering, and digest examples.

## Install

```bash
cd python-client
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

On Windows, activate with `.venv\Scripts\activate` instead.

## Search programmatically

```python
from jobicy import JobicyClient

with JobicyClient(timeout=15) as client:
    jobs = client.get_jobs(count=50, geo="usa", industry="engineering")

for job in jobs:
    print(job.job_title, job.company_name, job.salary_display, job.url)
```

`get_jobs()` accepts `count`, `geo`, `industry`, and `tag`. It returns `Job` dataclass instances, removes duplicate IDs, validates original Jobicy URLs, and preserves optional fields safely. Use `job.to_dict()` for a serializable representation.

```bash
python examples/search_jobs.py
python examples/export_csv.py --output jobs.csv --geo usa --industry engineering
python examples/salary_filter.py --minimum 120000 --currency USD --period yearly
python examples/daily_digest.py --count 12 --geo canada --tag python
```

## Read all available pages

```python
with JobicyClient() as client:
    for job in client.iter_jobs(count=100, geo="usa"):
        print(job.job_title, job.url)

with JobicyClient() as client:
    first = client.get_jobs_page(count=100, geo="usa")
    if first.next_cursor is not None:
        second = client.get_jobs_page(count=100, geo="usa", cursor=first.next_cursor)
        print(second.jobs)
```

`get_jobs()` still returns a list for one page. `get_jobs_page()` returns a `JobPage` with `jobs`, `next_cursor`, and `has_more`; `iter_jobs()` streams all pages and `get_all_jobs()` collects them. Counts range from 1 to 200 per page; the client default remains 50. Iterators retain filters, deduplicate across pages, continue past empty pages with a next cursor, and reject repeated cursors.

The feed covers the last seven days. Cursors expire after 24 hours; HTTP 400 requires a fresh traversal without a cursor and preserved delivery IDs. HTTP failures stop an export rather than returning a partial result. Start new automated traversals hourly or less often.

## Check stored job statuses

`GET https://jobicy.com/api/v2/remote-jobs/status?ids=123456,123457,123458` checks up to 100 supplied IDs per request. Replace example IDs with IDs you have stored. Duplicate IDs are returned once in first-occurrence order. The response contains `checkedAt`, `count`, and `jobs: [{ id, status }]`.

`active` means open, `closed` means expired or filled, and `unknown` means the record is missing or not exposed publicly. The check includes older jobs outside the seven-day feed window. Absence from the feed does not imply closure. Keep `unknown` and request failures separate from `closed`.

Checks are free and require no key; a valid optional Bearer key adds `total_request_cost: 0`. Public results can be cached for 60 seconds. Split larger lists into batches, observe rate limits, and follow `Retry-After` on HTTP 429. Only `ids` is accepted; no cursor or feed filters apply. [Full status contract](https://github.com/Jobicy/remote-jobs-api#batch-status-check).

```python
with JobicyClient() as client:
    statuses = client.get_job_statuses([123456, 123457, 123458])
for item in statuses:
    print(item.id, item.status)
```

```bash
python examples/check_status.py 123456,123457,123458
```

`get_job_statuses()` returns ordered `JobStatus` dataclass instances. It validates the batch and rejects incomplete, duplicate, or malformed response records. HTTP errors remain `JobicyError` or `JobicyRateLimitError`; the client does not silently turn failures into closed jobs.

[OpenAPI JSON](https://jobicy.com/api/openapi.json) · [OpenAPI YAML](https://jobicy.com/api/openapi.yaml)

`export_csv.py` traverses all pages and writes a real UTF-8 CSV file. Its `--count` controls page size. The salary example traverses the available feed, excludes jobs without disclosed compensation and compares only the requested currency and pay period. The digest writes readable text suitable for a scheduled newsletter pipeline.

`JobicyError.status` contains the HTTP status when available. Handle `JobicyError` for network failures, invalid JSON, malformed responses, and HTTP failures. Handle `JobicyRateLimitError` separately when you need its optional `retry_after_seconds` value. Cache automated queries and follow the published [Jobicy fair-use guidance](https://jobicy.com/jobs-rss-feed).
