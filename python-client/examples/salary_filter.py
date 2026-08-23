import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jobicy import JobicyClient, JobicyError


def main() -> None:
    parser = argparse.ArgumentParser(description="Show Jobicy jobs with a disclosed minimum salary.")
    parser.add_argument("--minimum", type=float, default=100000)
    parser.add_argument("--currency", default="USD")
    parser.add_argument("--period", default="yearly")
    parser.add_argument("--geo", default="")
    arguments = parser.parse_args()

    if arguments.minimum < 0:
        parser.error("--minimum must not be negative")

    try:
        with JobicyClient() as client:
            jobs = client.get_jobs(count=100, geo=arguments.geo)
    except (JobicyError, ValueError) as error:
        print(f"Could not retrieve salary data: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    matches = [
        job for job in jobs
        if job.salary_min is not None
        and job.salary_min >= arguments.minimum
        and (job.salary_currency or "").upper() == arguments.currency.upper()
        and (job.salary_period or "").lower() == arguments.period.lower()
    ]

    if not matches:
        print("No jobs with matching disclosed compensation were found.")
        return

    for job in sorted(matches, key=lambda item: item.salary_min or 0, reverse=True):
        print(f"{job.job_title} — {job.company_name} — {job.salary_display}")
        print(job.url)

    print(f"\n{len(matches)} matching jobs. Jobs powered by https://jobicy.com/")


if __name__ == "__main__":
    main()
