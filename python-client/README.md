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

`export_csv.py` writes a real UTF-8 CSV file. The salary example excludes jobs without disclosed compensation and compares only the requested currency and pay period. The digest writes readable text suitable for a scheduled newsletter pipeline.

Handle `JobicyError` for network failures, invalid JSON, malformed responses, and HTTP failures. Handle `JobicyRateLimitError` separately when you need its optional `retry_after_seconds` value. Cache automated queries and follow the published [Jobicy fair-use guidance](https://jobicy.com/jobs-rss-feed).
