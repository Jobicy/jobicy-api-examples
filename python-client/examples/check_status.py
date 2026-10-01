import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jobicy import JobicyClient, JobicyError


def main() -> None:
    parser = argparse.ArgumentParser(description="Check up to 100 stored Jobicy job IDs.")
    parser.add_argument("ids", nargs="+", help="Job IDs, comma-separated or space-separated")
    arguments = parser.parse_args()
    ids = [identifier for value in arguments.ids for identifier in value.split(",")]
    try:
        with JobicyClient() as client:
            for item in client.get_job_statuses(ids):
                print(f"{item.id}: {item.status}")
    except (JobicyError, ValueError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
