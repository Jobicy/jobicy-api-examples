from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jobicy import JobicyClient, JobicyError


def main() -> None:
    try:
        with JobicyClient() as client:
            jobs = client.get_jobs(count=20, geo="usa", industry="engineering")
    except (JobicyError, ValueError) as error:
        print(f"Could not fetch jobs: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    if not jobs:
        print("No matching remote jobs found.")
        return

    for job in jobs:
        print(f"{job.job_title} — {job.company_name}")
        print(f"  {job.location}")
        if job.salary_display:
            print(f"  {job.salary_display}")
        print(f"  {job.url}\n")

    print(f"{len(jobs)} jobs found. Jobs powered by https://jobicy.com/")


if __name__ == "__main__":
    main()
