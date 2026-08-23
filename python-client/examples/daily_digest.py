import argparse
from datetime import datetime, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jobicy import JobicyClient, JobicyError


def main() -> None:
    parser = argparse.ArgumentParser(description="Print a readable daily remote-job digest.")
    parser.add_argument("--count", type=int, default=15)
    parser.add_argument("--geo", default="")
    parser.add_argument("--industry", default="")
    parser.add_argument("--tag", default="")
    arguments = parser.parse_args()

    try:
        with JobicyClient() as client:
            jobs = client.get_jobs(arguments.count, arguments.geo, arguments.industry, arguments.tag)
    except (JobicyError, ValueError) as error:
        print(f"Could not build the digest: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    today = datetime.now(timezone.utc).strftime("%A, %B %d, %Y")
    print(f"REMOTE JOB DIGEST — {today}\n")

    if not jobs:
        print("No matching jobs were available for this edition.")
    else:
        for index, job in enumerate(jobs, start=1):
            print(f"{index}. {job.job_title}")
            print(f"   {job.company_name} | {job.location}")
            if job.salary_display:
                print(f"   {job.salary_display}")
            if job.excerpt:
                print(f"   {job.excerpt[:220]}")
            print(f"   {job.url}\n")

    print("Jobs powered by Jobicy — https://jobicy.com/")


if __name__ == "__main__":
    main()
