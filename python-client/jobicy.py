from __future__ import annotations

from dataclasses import asdict, dataclass
from html import unescape
from math import isfinite
import re
from typing import Any, Iterator, Literal
from urllib.parse import urlsplit

import requests


class JobicyError(Exception):
    def __init__(self, message: str, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


class JobicyRateLimitError(JobicyError):
    def __init__(self, message: str, retry_after_seconds: int | None = None) -> None:
        super().__init__(message, status=429)
        self.retry_after_seconds = retry_after_seconds


@dataclass(frozen=True, slots=True)
class Job:
    id: int | str
    url: str
    job_title: str
    company_name: str
    company_logo: str | None
    industries: tuple[str, ...]
    job_types: tuple[str, ...]
    location: str
    level: str | None
    excerpt: str
    published_at: str | None
    salary_min: float | None
    salary_max: float | None
    salary_currency: str | None
    salary_period: str | None

    @classmethod
    def from_api(cls, payload: dict[str, Any]) -> Job:
        def text(key: str, default: str = "") -> str:
            value = payload.get(key)
            return unescape(str(value)).strip() if value is not None else default

        def amount(key: str) -> float | None:
            value = payload.get(key)

            if value in (None, "") or isinstance(value, bool):
                return None

            try:
                number = float(value)
            except (TypeError, ValueError):
                return None

            return number if isfinite(number) and number > 0 else None

        def labels(key: str) -> tuple[str, ...]:
            values = payload.get(key)
            if not isinstance(values, list):
                return ()
            return tuple(unescape(str(value)).strip() for value in values if str(value).strip())

        return cls(
            id=payload["id"],
            url=str(payload["url"]),
            job_title=text("jobTitle") or "Remote opportunity",
            company_name=text("companyName") or "Company not specified",
            company_logo=(text("companyLogo") or None) if isinstance(payload.get("companyLogo"), str) else None,
            industries=labels("jobIndustry"),
            job_types=labels("jobType"),
            location=text("jobGeo") or "Location not specified",
            level=text("jobLevel") or None,
            excerpt=re.sub(r"\s+", " ", re.sub(r"<[^>]*>", " ", text("jobExcerpt"))).strip(),
            published_at=text("pubDate") or None,
            salary_min=amount("salaryMin"),
            salary_max=amount("salaryMax"),
            salary_currency=text("salaryCurrency") or None,
            salary_period=text("salaryPeriod") or None,
        )

    @property
    def salary_display(self) -> str:
        if self.salary_min is None and self.salary_max is None:
            return ""

        currency = self.salary_currency or "USD"

        if self.salary_min is not None and self.salary_max is not None and self.salary_min != self.salary_max:
            amount = f"{self.salary_min:,.0f}–{self.salary_max:,.0f}"
        else:
            amount = f"{self.salary_min if self.salary_min is not None else self.salary_max:,.0f}"

        period = f" / {self.salary_period}" if self.salary_period else ""
        return f"{currency} {amount}{period}"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class JobPage:
    jobs: list[Job]
    next_cursor: str | None
    has_more: bool


@dataclass(frozen=True, slots=True)
class JobStatus:
    id: int
    status: Literal["active", "closed", "unknown"]


class JobicyClient:
    api_url = "https://jobicy.com/api/v2/remote-jobs"

    def __init__(self, timeout: float = 15.0, session: requests.Session | None = None) -> None:
        if not isinstance(timeout, (int, float)) or timeout <= 0:
            raise ValueError("timeout must be a positive number of seconds")

        self.timeout = float(timeout)
        self.session = session or requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "User-Agent": "Jobicy-Integration-Example/python-client",
        })

    def get_jobs(
        self,
        count: int = 50,
        geo: str | None = None,
        industry: str | None = None,
        tag: str | None = None,
    ) -> list[Job]:
        return self.get_jobs_page(count, geo, industry, tag).jobs

    def iter_jobs(
        self,
        count: int = 50,
        geo: str | None = None,
        industry: str | None = None,
        tag: str | None = None,
        cursor: str | None = None,
    ) -> Iterator[Job]:
        cursors = {cursor} if cursor else set()
        ids: set[str] = set()
        while True:
            page = self.get_jobs_page(count, geo, industry, tag, cursor)
            for job in page.jobs:
                identifier = str(job.id)
                if identifier not in ids:
                    ids.add(identifier)
                    yield job
            cursor = page.next_cursor
            if cursor is None:
                break
            if cursor in cursors:
                raise JobicyError("Jobicy returned a repeated cursor")
            cursors.add(cursor)

    def get_all_jobs(
        self,
        count: int = 50,
        geo: str | None = None,
        industry: str | None = None,
        tag: str | None = None,
        cursor: str | None = None,
    ) -> list[Job]:
        return list(self.iter_jobs(count, geo, industry, tag, cursor))

    def get_jobs_page(
        self,
        count: int = 50,
        geo: str | None = None,
        industry: str | None = None,
        tag: str | None = None,
        cursor: str | None = None,
    ) -> JobPage:
        if isinstance(count, bool) or not isinstance(count, int) or not 1 <= count <= 200:
            raise ValueError("count must be an integer between 1 and 200")

        parameters: dict[str, str | int] = {"count": count}
        if cursor is not None:
            if not isinstance(cursor, str) or not cursor:
                raise ValueError("cursor must be a nonempty string or None")
            parameters["cursor"] = cursor

        for name, value in (("geo", geo), ("industry", industry), ("tag", tag)):
            if value is None:
                continue
            if not isinstance(value, str):
                raise ValueError(f"{name} must be a string")
            if value.strip():
                parameters[name] = value.strip()

        payload = self._request(self.api_url, parameters)

        if not isinstance(payload, dict) or not isinstance(payload.get("jobs"), list):
            raise JobicyError("Jobicy API response does not contain a jobs array")

        unique: dict[str, Job] = {}

        for item in payload["jobs"]:
            if not isinstance(item, dict) or item.get("id") is None or not isinstance(item.get("url"), str):
                continue

            try:
                parsed_url = urlsplit(item["url"])
            except ValueError:
                continue
            if parsed_url.scheme != "https" or parsed_url.hostname != "jobicy.com":
                continue

            try:
                job = Job.from_api(item)
            except (TypeError, ValueError, KeyError):
                continue

            unique[str(job.id)] = job

        next_cursor = payload.get("nextCursor")
        if ("nextCursor" not in payload or
            (next_cursor is not None and (not isinstance(next_cursor, str) or not next_cursor)) or
            not isinstance(payload.get("hasMore"), bool) or
            payload["hasMore"] != (next_cursor is not None)):
            raise JobicyError("Jobicy API returned invalid pagination metadata")

        return JobPage(list(unique.values()), next_cursor, payload["hasMore"])

    def _request(self, endpoint: str, parameters: dict[str, str | int]) -> Any:
        try:
            response = self.session.get(endpoint, params=parameters, timeout=self.timeout)
        except requests.Timeout as error:
            raise JobicyError(f"Jobicy request timed out after {self.timeout:g} seconds") from error
        except requests.RequestException as error:
            raise JobicyError(f"Jobicy request failed: {error}") from error

        if response.status_code == 429:
            retry_header = response.headers.get("Retry-After", "")
            retry_after = int(retry_header) if retry_header.isdigit() else None
            raise JobicyRateLimitError("Jobicy temporarily rate limited the request", retry_after)

        if not response.ok:
            raise JobicyError(f"Jobicy API returned HTTP {response.status_code}", status=response.status_code)

        try:
            payload = response.json()
        except (ValueError, requests.RequestException) as error:
            raise JobicyError("Jobicy API returned invalid JSON") from error

        return payload

    def get_job_statuses(self, ids: list[int | str] | tuple[int | str, ...]) -> list[JobStatus]:
        if not isinstance(ids, (list, tuple)) or not 1 <= len(ids) <= 100:
            raise ValueError("ids must contain between 1 and 100 job IDs")
        normalized: list[int] = []
        for identifier in ids:
            if isinstance(identifier, bool) or not isinstance(identifier, (int, str)):
                raise ValueError("Each job ID must be a positive integer")
            value = str(identifier).strip()
            if not re.fullmatch(r"[1-9][0-9]{0,15}", value) or int(value) > 9007199254740991:
                raise ValueError("Each job ID must be a positive safe integer without leading zeros")
            number = int(value)
            if number not in normalized:
                normalized.append(number)
        payload = self._request(self.api_url + "/status", {"ids": ",".join(map(str, normalized))})
        if (not isinstance(payload, dict) or payload.get("success") is not True or
            payload.get("count") != len(normalized) or not isinstance(payload.get("jobs"), list)):
            raise JobicyError("Jobicy API returned an invalid status response")
        result: dict[int, JobStatus] = {}
        for item in payload["jobs"]:
            if (not isinstance(item, dict) or isinstance(item.get("id"), bool) or
                not isinstance(item.get("id"), int) or item["id"] not in normalized or
                item["id"] in result or item.get("status") not in ("active", "closed", "unknown")):
                raise JobicyError("Jobicy API returned an invalid status record")
            result[item["id"]] = JobStatus(item["id"], item["status"])
        if len(result) != len(normalized):
            raise JobicyError("Jobicy API returned an incomplete status response")
        return [result[identifier] for identifier in normalized]

    def close(self) -> None:
        self.session.close()

    def __enter__(self) -> JobicyClient:
        return self

    def __exit__(self, exc_type: object, exc_value: object, traceback: object) -> None:
        self.close()
