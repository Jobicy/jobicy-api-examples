from __future__ import annotations

from dataclasses import asdict, dataclass
from html import unescape
from math import isfinite
import re
from typing import Any
from urllib.parse import urlsplit

import requests


class JobicyError(Exception):
    pass


class JobicyRateLimitError(JobicyError):
    def __init__(self, message: str, retry_after_seconds: int | None = None) -> None:
        super().__init__(message)
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
            company_logo=text("companyLogo") or None,
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
        if isinstance(count, bool) or not isinstance(count, int) or not 1 <= count <= 100:
            raise ValueError("count must be an integer between 1 and 100")

        parameters: dict[str, str | int] = {"count": count}

        for name, value in (("geo", geo), ("industry", industry), ("tag", tag)):
            if value is None:
                continue
            if not isinstance(value, str):
                raise ValueError(f"{name} must be a string")
            if value.strip():
                parameters[name] = value.strip()

        try:
            response = self.session.get(self.api_url, params=parameters, timeout=self.timeout)
        except requests.Timeout as error:
            raise JobicyError(f"Jobicy request timed out after {self.timeout:g} seconds") from error
        except requests.RequestException as error:
            raise JobicyError(f"Jobicy request failed: {error}") from error

        if response.status_code == 429:
            retry_header = response.headers.get("Retry-After", "")
            retry_after = int(retry_header) if retry_header.isdigit() else None
            raise JobicyRateLimitError("Jobicy temporarily rate limited the request", retry_after)

        if not response.ok:
            raise JobicyError(f"Jobicy API returned HTTP {response.status_code}")

        try:
            payload = response.json()
        except (ValueError, requests.RequestException) as error:
            raise JobicyError("Jobicy API returned invalid JSON") from error

        if not isinstance(payload, dict) or not isinstance(payload.get("jobs"), list):
            raise JobicyError("Jobicy API response does not contain a jobs array")

        unique: dict[str, Job] = {}

        for item in payload["jobs"]:
            if not isinstance(item, dict) or item.get("id") is None or not isinstance(item.get("url"), str):
                continue

            parsed_url = urlsplit(item["url"])
            if parsed_url.scheme != "https" or parsed_url.hostname != "jobicy.com":
                continue

            try:
                job = Job.from_api(item)
            except (TypeError, ValueError, KeyError):
                continue

            unique[str(job.id)] = job

        return list(unique.values())

    def close(self) -> None:
        self.session.close()

    def __enter__(self) -> JobicyClient:
        return self

    def __exit__(self, exc_type: object, exc_value: object, traceback: object) -> None:
        self.close()
