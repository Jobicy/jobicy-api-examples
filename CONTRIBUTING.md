# Contributing

Thanks for improving Jobicy integrations. Keep each example practical, independent, and safe to deploy.

## Submit a change

1. Fork the repository on GitHub.
2. Create a focused branch: `git checkout -b integration/your-change`.
3. Implement the change and update the relevant README.
4. Install the project's declared dependencies and run its documented checks or examples.
5. Verify timeouts, API failures, empty responses, optional fields, original Jobicy URLs, and secret handling.
6. Commit the changes, push your branch, and open a pull request explaining the implementation and test results.

## Integration requirements

Use the official Jobs API, RSS feed, or MCP endpoint. Do not scrape Jobicy HTML, exceed published request-frequency limits, bypass API restrictions, commit live tokens or webhook URLs, invent response fields, replace original application URLs, or ship simulated listing data. Public-facing interfaces must visibly credit Jobicy. Keep automation state bounded and deduplicate listings across restarts.

## Practical checks

Run `node --check` for JavaScript, `python -m py_compile` for Python, `php -l` for PHP when PHP is installed, and the documented Next.js typecheck/build when its dependencies are available. Validate JSON files before submitting a pull request.
