from pathlib import Path
import sys
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python-client"))
from jobicy import JobicyClient, JobicyError, JobicyRateLimitError, JobStatus


def response(jobs, status=200, headers=None, **extra):
    result = Mock(status_code=status, ok=status == 200, headers=headers or {})
    result.json.return_value = {"success": True, "count": len(jobs), "jobs": jobs, **extra}
    return result


class StatusTests(unittest.TestCase):
    def client(self, result):
        session = Mock()
        session.get.return_value = result
        return JobicyClient(session=session), session

    def test_order_dedup_and_unknown(self):
        client, session = self.client(response([{"id": 3, "status": "unknown"}, {"id": 2, "status": "closed"}, {"id": 1, "status": "active"}]))
        self.assertEqual(client.get_job_statuses([1, " 2 ", 1, 3]), [JobStatus(1, "active"), JobStatus(2, "closed"), JobStatus(3, "unknown")])
        self.assertEqual(session.get.call_args.args[0], "https://jobicy.com/api/v2/remote-jobs/status")
        self.assertEqual(session.get.call_args.kwargs["params"], {"ids": "1,2,3"})

    def test_invalid_and_maximum_batch(self):
        client, session = self.client(response([{"id": 9007199254740991, "status": "unknown"}]))
        for ids in ([], "1", [0], [-1], [True], [1.5], ["001"], ["+1"], ["1e3"], [9007199254740992], [None], [1] * 101):
            with self.subTest(ids=ids), self.assertRaises(ValueError):
                client.get_job_statuses(ids)
        session.get.assert_not_called()
        self.assertEqual(len(client.get_job_statuses([9007199254740991] * 100)), 1)

    def test_malformed_response(self):
        for result in (
            response([], count=2),
            response([{"id": 1, "status": "active"}] * 2),
            response([{"id": 1, "status": "active"}, {"id": 3, "status": "closed"}]),
            response([{"id": 1, "status": "expired"}, {"id": 2, "status": "closed"}]),
            response([{"id": True, "status": "active"}, {"id": 2, "status": "closed"}]),
            response([{"id": 1, "status": "active"}, {"id": "2", "status": "closed"}]),
        ):
            client, _ = self.client(result)
            with self.assertRaises(JobicyError):
                client.get_job_statuses([1, 2])

    def test_http_errors(self):
        client, session = self.client(response([], status=400))
        with self.assertRaises(JobicyError) as caught:
            client.get_job_statuses([1])
        self.assertEqual(caught.exception.status, 400)
        session.get.return_value = response([], status=429, headers={"Retry-After": "60"})
        with self.assertRaises(JobicyRateLimitError) as caught:
            client.get_job_statuses([1])
        self.assertEqual(caught.exception.retry_after_seconds, 60)


if __name__ == "__main__":
    unittest.main()
