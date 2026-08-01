# Opportunity brief

## Selected job

Vercel and Next.js teams need to review the combined timing of scheduled functions before a production deployment. A valid cron expression can still collide with another job, overlap its own previous run, concentrate compute into one minute, target a missing route, or lack a clear owner.

Vercel documents that cron jobs run only on production deployments, treat redirects as final, and can invoke paths that return 404. Cloudflare documents a separate UTC cron dialect. The release therefore stays deliberately Vercel-specific instead of pretending scheduler syntax is portable.

Existing tools cover adjacent stages. Crontab.guru explains one expression. Cronitor monitors deployed jobs and prices its Business plan by monitor and user. CronOverlap models the whole proposed manifest before deployment and does not claim to replace runtime monitoring.

## Alternatives considered

- CSP rollout planning: credible security need and paid reporting market, but a useful enforcement decision needs report-only browser traffic and overlaps the portfolio's existing web-security release checks.
- Cache-policy mapping: important for personalized responses and CDN behavior, but the first release would resemble header diagnostics and performance tools more than a distinct operational workflow.

## Commercial hypothesis

The free product simulates one manifest locally. Team is a [TARGET] $18 per workspace/month hypothesis for cross-repository schedule inventory, version history, owner approvals, CI enforcement, platform adapters, and monitoring handoff. Demand, price acceptance, customers, and revenue are unverified.

## Sources

- https://vercel.com/docs/cron-jobs/quickstart
- https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://crontab.guru/
- https://cronitor.io/pricing
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- https://report-uri.com/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
- https://developers.cloudflare.com/cache/concepts/cache-control/
- https://api.webpagetest.org/signup
