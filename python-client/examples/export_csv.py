import argparse
import csv
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jobicy import JobicyClient, JobicyError


def main() -> None:
    parser = argparse.ArgumentParser(description="Export current Jobicy jobs to a CSV file.")
    parser.add_argument("--output", default="jobs.csv", help="CSV output path")
    parser.add_argument("--count", type=int, default=50, help="Jobs to request, from 1 through 100")
    parser.add_argument("--geo", default="")
    parser.add_argument("--industry", default="")
    parser.add_argument("--tag", default="")
    arguments = parser.parse_args()

    try:
        with JobicyClient() as client:
            jobs = client.get_jobs(arguments.count, arguments.geo, arguments.industry, arguments.tag)
    except (JobicyError, ValueError) as error:
        print(f"Could not export jobs: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    output = Path(arguments.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["id", "title", "company", "location", "industries", "job_types", "salary", "published_at", "url"]

    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()

        for job in jobs:
            writer.writerow({
                "id": job.id,
                "title": job.job_title,
                "company": job.company_name,
                "location": job.location,
                "industries": ", ".join(job.industries),
                "job_types": ", ".join(job.job_types),
                "salary": job.salary_display,
                "published_at": job.published_at or "",
                "url": job.url,
            })

    print(f"Exported {len(jobs)} Jobicy jobs to {output.resolve()}")


if __name__ == "__main__":
    main()
