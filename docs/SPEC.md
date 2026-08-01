# Product specification

## User journey

1. Set a UTC reference date and a 7- or 14-day horizon.
2. Paste an enriched CronOverlap job manifest or a plain Vercel `crons` object.
3. Run the simulation entirely in the browser.
4. Review start bursts, overlapping execution windows, ownership, protection assumptions, per-job run counts, and the hour-by-day load board.
5. Copy a finding report or JSON audit artifact for release review.

## Input contract

- JSON only, at most 500,000 characters and 25 jobs.
- Standard five-field Vercel cron syntax: wildcard, number, list, range, and step values. Month and weekday names are accepted.
- UTC simulation only.
- Enriched jobs require `name`, `path`, `schedule`, `durationMinutes`, `owner`, and `protected`.
- Plain Vercel jobs receive a five-minute planning duration, `unassigned` owner, and unconfirmed protection. The report states each default.

## Finding contract

- `CRO002`: invalid or unsupported cron expression.
- `CRO003`: endpoint path does not start with `/`.
- `CRO004`: exact endpoint and schedule duplicate.
- `CRO005`: two jobs start in the same minute.
- `CRO006`: three or more jobs start in the same minute.
- `CRO007`: different jobs have overlapping execution windows.
- `CRO008`: a job starts again before its assumed prior run finishes.
- `CRO009`: average frequency exceeds [TARGET] 288 starts per day.
- `CRO010`: owner is missing or unassigned.
- `CRO011`: endpoint protection is unconfirmed.
- `CRO012`: duration uses the five-minute planning default.

Critical and high findings set the release state to `conflict`. Medium-only findings set it to `review`. No findings set it to `clear`.

## Non-functional constraints

- No manifest upload, persistence, network fetch, account, credential, or server mutation.
- Simulation caps bound browser work.
- Output records the reference date and assumptions; it does not include the original JSON string.
- Responsive layout, keyboard operation, visible focus, 44px controls, AA contrast, and reduced-motion support.

## Monetization and measurement

- Free: one local manifest.
- Team: [TARGET] $18 per workspace/month for cross-repository inventory, approvals, CI, platform adapters, and monitoring handoff.
- Event names only: `planner_viewed`, `manifest_simulated`, `collision_report_copied`, `team_interest`, `feedback_intent`.

## Threat considerations

- Treat manifest text as untrusted data and render it only as text.
- Reject oversized, malformed, and unsupported input with specific recovery instructions.
- Do not infer that `protected: true` proves correct authorization.
- Do not infer that a clear static schedule proves invocation success, duration, idempotency, or endpoint availability.

## Non-goals

- Runtime monitoring, alerting, endpoint requests, CRON_SECRET validation, scheduler deployment, Quartz extensions, seconds fields, timezone conversion, or automatic schedule changes.
