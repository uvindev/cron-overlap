/**
 * @project  CronOverlap — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import { IntentLink } from "@/components/intent-link";
import { Workbench } from "./_components/workbench";
import type { CSSProperties } from "react";

const hourMarks = ["00", "04", "08", "12", "16", "20", "24"];

export default function Home() {
  return (
    <main id="top">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="CronOverlap home">
          <span>CO</span>
          <b>CRON/OVERLAP</b>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#planner">Simulator</a>
          <a href="#boundary">Boundary</a>
          <a href="#team">Team</a>
        </nav>
        <span className="utc-stamp">UTC / 5 FIELD</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">PRE-DEPLOYMENT TIMETABLE / BUILD 07</p>
          <h1 id="hero-title">
            Your schedule file has no concept of duration.
          </h1>
          <p>
            Simulate the full Vercel cron manifest before production. See which
            jobs start together, which runs remain active, and who owns the
            release decision.
          </p>
          <a className="primary-link" href="#planner">
            Inspect the supplied timetable
          </a>
        </div>

        <div
          className="signal-diagram"
          aria-label="Example schedule overlap diagram"
        >
          <div className="signal-topline">
            <span>WEEK 32</span>
            <b>MON / UTC</b>
            <span>PEAK 03</span>
          </div>
          <div className="time-axis">
            {hourMarks.map((mark) => (
              <span key={mark}>{mark}</span>
            ))}
          </div>
          <div className="track-row">
            <code>invoice</code>
            <i style={{ "--start": 33, "--width": 15 } as CSSProperties}>20m</i>
          </div>
          <div className="track-row conflict-track">
            <code>crm-sync</code>
            <i style={{ "--start": 33, "--width": 27 } as CSSProperties}>45m</i>
          </div>
          <div className="track-row">
            <code>warehouse</code>
            <i style={{ "--start": 33, "--width": 38 } as CSSProperties}>60m</i>
          </div>
          <div className="collision-line">
            <span>08:00</span>
            <b>03 STARTS / SHARED WINDOW</b>
          </div>
        </div>
      </section>

      <Workbench />

      <section
        className="boundary"
        id="boundary"
        aria-labelledby="boundary-title"
      >
        <header>
          <p className="eyebrow">EVIDENCE BOUNDARY</p>
          <h2 id="boundary-title">
            A clear timetable is not a healthy runtime.
          </h2>
        </header>
        <div className="boundary-list">
          <article>
            <span>01</span>
            <div>
              <strong>Static UTC model</strong>
              <p>
                No request reaches Vercel, the scheduled route, a database, or a
                downstream API.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <strong>Duration is supplied</strong>
              <p>
                An overlap is only as accurate as the planning duration entered
                for each job.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <strong>Protection is unverified</strong>
              <p>
                A manifest flag cannot prove CRON_SECRET validation,
                authorization, idempotency, or successful execution.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="team" id="team" aria-labelledby="team-title">
        <div>
          <p className="eyebrow">COMMERCIAL HYPOTHESIS</p>
          <h2 id="team-title">
            One manifest is free. Release ownership spans repositories.
          </h2>
          <p>
            Team would add cross-repository inventory, version history, owner
            approvals, CI enforcement, platform adapters, and monitoring
            handoff. Price and demand are unverified.
          </p>
        </div>
        <aside>
          <span>TEAM / TARGET</span>
          <strong>
            <b>$18</b> / workspace / month
          </strong>
          <IntentLink
            event="team_interest"
            href="mailto:hello@iamuvin.com?subject=CronOverlap%20Team%20pilot"
          >
            Request a Team pilot
          </IntentLink>
        </aside>
      </section>

      <footer>
        <div>
          <b>CRON/OVERLAP 0.1</b>
          <span>Manifest analysis stays local</span>
        </div>
        <IntentLink
          event="feedback_intent"
          href="mailto:hello@iamuvin.com?subject=CronOverlap%20feedback"
        >
          Send product feedback
        </IntentLink>
        <span className="built-by">
          Built by{" "}
          <a
            href="https://iamuvin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uvin Vindula
          </a>
        </span>
      </footer>
    </main>
  );
}
