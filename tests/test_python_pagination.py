from pathlib import Path
import sys
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python-client"))

from jobicy import JobicyClient, JobicyError, JobicyRateLimitError


def job(identifier, **extra):
    return {"id": identifier, "url": f"https://jobicy.com/jobs/{identifier}", **extra}


def page(jobs, cursor=None):
    return {"jobs": jobs, "nextCursor": cursor, "hasMore": cursor is not None}


def response(body, status=200, headers=None):
    result = Mock(status_code=status, ok=200 <= status < 300, headers=headers or {})
    result.json.return_value = body
    return result


class PaginationTests(unittest.TestCase):
    def client(self, *responses):
        session = Mock()
        session.get.side_effect = list(responses)
        return JobicyClient(session=session), session

    def test_filters_cursors_and_empty_intermediate_pages(self):
        client, session = self.client(
            response(page([job(1), job(1)], "opaque+/= token")),
            response(page([], "second")),
            response(page([job(1), job(2, companyLogo=False)])),
        )
        jobs = client.get_all_jobs(count=200, geo="usa", industry="engineering", tag="python")
        self.assertEqual([entry.id for entry in jobs], [1, 2])
        self.assertIsNone(jobs[1].company_logo)
        parameters = [call.kwargs["params"] for call in session.get.call_args_list]
        self.assertNotIn("cursor", parameters[0])
        self.assertEqual(parameters[1]["cursor"], "opaque+/= token")
        for values in parameters:
            self.assertEqual(values["count"], 200)
            self.assertEqual(values["geo"], "usa")
            self.assertEqual(values["industry"], "engineering")
            self.assertEqual(values["tag"], "python")

    def test_page_and_list_methods(self):
        client, _ = self.client(response(page([job(1)], "next")), response(page([job(1)])))
        result = client.get_jobs_page()
        self.assertEqual(result.next_cursor, "next")
        self.assertTrue(result.has_more)
        self.assertEqual([entry.id for entry in client.get_jobs()], [1])
        with self.assertRaises(ValueError):
            client.get_jobs(count=201)

    def test_repeated_cursor(self):
        client, _ = self.client(response(page([], "repeat")), response(page([], "repeat")))
        with self.assertRaisesRegex(JobicyError, "repeated cursor"):
            client.get_all_jobs()

    def test_invalid_metadata(self):
        client, _ = self.client(response({"jobs": [], "nextCursor": None, "hasMore": True}))
        with self.assertRaisesRegex(JobicyError, "pagination metadata"):
            client.get_jobs_page()

    def test_expired_cursor_is_not_restarted_silently(self):
        client, session = self.client(response({"error": "expired"}, 400))
        with self.assertRaises(JobicyError) as caught:
            client.get_all_jobs(cursor="expired")
        self.assertEqual(caught.exception.status, 400)
        self.assertEqual(session.get.call_count, 1)

    def test_rate_limit(self):
        client, _ = self.client(response({}, 429, {"Retry-After": "7200"}))
        with self.assertRaises(JobicyRateLimitError) as caught:
            client.get_jobs_page()
        self.assertEqual(caught.exception.status, 429)
        self.assertEqual(caught.exception.retry_after_seconds, 7200)


if __name__ == "__main__":
    unittest.main()
