# Jobicy Remote Jobs Widget

A self-contained WordPress plugin that renders cached Jobicy remote jobs using a shortcode.

## Install

1. Compress the `jobicy-remote-jobs-widget` directory by itself, keeping that directory as the archive root.
2. In WordPress, open **Plugins → Add New Plugin → Upload Plugin**.
3. Upload the archive, install it, and activate **Jobicy Remote Jobs Widget**.
4. Add the shortcode to a page, post, shortcode block, or shortcode-compatible widget.

```text
[jobicy_jobs]
[jobicy_jobs count="10" geo="usa" industry="engineering"]
[jobicy_jobs count="5" geo="canada" tag="python"]
[jobicy_jobs count="12" industry="marketing"]
```

| Attribute | Default | Meaning |
| --- | --- | --- |
| `count` | `10` | Number of jobs, clamped to the widget display range of 1–100 |
| `geo` | Empty | Official Jobicy location slug |
| `industry` | Empty | Official Jobicy category slug |
| `tag` | Empty | Official Jobicy keyword search |

Discover current [location slugs](https://jobicy.com/api/v2/remote-jobs?get=locations) and [industry slugs](https://jobicy.com/api/v2/remote-jobs?get=industries).

The widget intentionally requests one page of recent listings; it does not crawl the entire seven-day feed. The API allows up to 200 jobs per page and supports cursors for full-feed integrations.

[OpenAPI JSON](https://jobicy.com/api/openapi.json) · [OpenAPI YAML](https://jobicy.com/api/openapi.yaml)

Requests use the WordPress HTTP API with a 12-second timeout. Successful responses are cached with WordPress transients for one hour, and a separate 24-hour stale cache is used if Jobicy becomes temporarily unavailable. Input is sanitized, displayed values are escaped, duplicate IDs are removed, canonical Jobicy URLs are validated, and no direct database calls are used.

The plugin requires WordPress 6.0+ and PHP 7.4+. It preserves visible **[Jobs powered by Jobicy](https://jobicy.com/)** attribution and links every job to its original Jobicy listing.

## Stored listings

If you extend this integration to retain listings, use the [batch status endpoint](../README.md#check-stored-job-statuses) to check up to 100 IDs at a time. Older open jobs can remain `active` after leaving the seven-day feed. Do not mark jobs closed just because a fresh feed omits them, or because a check returns `unknown` or fails. The sample does not automatically reconcile stored listings.
