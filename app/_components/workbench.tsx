"use client";

import { useEffect, useState } from "react";
import { ZodError } from "zod";
import {
  findingReportCsv,
  PlannerInputError,
  simulateManifest,
  simulationArtifact,
} from "@/lib/cron/simulate";
import {
  clearManifest,
  defaultStartDate,
  riskyManifest,
  vercelManifest,
} from "@/lib/cron/sample";
import type { SimulationResult } from "@/lib/cron/types";
import { track } from "@/lib/analytics";

function stateCopy(result: SimulationResult): string {
  if (result.releaseState === "clear") {
    return "No schedule or planning findings were detected in this horizon.";
  }
  if (result.releaseState === "review") {
    return "Timing is clear. Planning assumptions still need an owner decision.";
  }
  return "The simulated timetable contains release conflicts.";
}

function failureMessage(error: unknown): string {
  if (error instanceof PlannerInputError) return error.message;
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "The planning input is invalid.";
  }
  return "The manifest could not be simulated.";
}

export function Workbench() {
  const [manifestText, setManifestText] = useState(riskyManifest);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [horizonDays, setHorizonDays] = useState<7 | 14>(7);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"report" | "artifact" | null>(
    null,
  );
  const [copyError, setCopyError] = useState("");

  useEffect(() => track("planner_viewed"), []);

  function simulateSchedule() {
    setCopyState(null);
    setCopyError("");
    try {
      setResult(simulateManifest({ manifestText, startDate, horizonDays }));
      setError("");
      track("manifest_simulated");
    } catch (cause) {
      setResult(null);
      setError(failureMessage(cause));
    }
  }

  function loadManifest(value: string) {
    setManifestText(value);
    setResult(null);
    setError("");
    setCopyState(null);
    setCopyError("");
  }

  async function copyOutput(kind: "report" | "artifact", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(kind);
      setCopyError("");
      if (kind === "report") track("collision_report_copied");
    } catch {
      setCopyError(
        "Clipboard access was denied. Select the output text and copy it manually.",
      );
    }
  }

  const reportOutput = result ? findingReportCsv(result) : "";
  const artifactOutput = result ? simulationArtifact(result) : "";
  const dates = result
    ? [...new Set(result.hours.map((hour) => hour.date))]
    : [];

  return (
    <section className="workbench" id="planner" aria-labelledby="planner-title">
      <header className="workbench-heading">
        <div>
          <p className="eyebrow">CONTROL DESK / UTC</p>
          <h2 id="planner-title">Run the timetable before production does.</h2>
        </div>
        <span>LOCAL SIMULATION</span>
      </header>

      <div className="control-strip">
        <label>
          <span>Reference start / UTC</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label>
          <span>Simulation horizon</span>
          <select
            value={horizonDays}
            onChange={(event) =>
              setHorizonDays(Number(event.target.value) as 7 | 14)
            }
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
          </select>
        </label>
        <div className="syntax-key" aria-label="Supported cron syntax">
          <span>5 FIELD</span>
          <code>* , - /</code>
          <small>UTC · Vercel syntax</small>
        </div>
      </div>

      <label className="manifest-editor">
        <span>
          <b>PLANNING MANIFEST</b>
          <small>
            {manifestText.length.toLocaleString()} characters / 500,000 max
          </small>
        </span>
        <textarea
          aria-label="Cron planning manifest JSON"
          spellCheck={false}
          value={manifestText}
          onChange={(event) => setManifestText(event.target.value)}
        />
      </label>

      <div className="workbench-actions">
        <button
          className="simulate-button"
          type="button"
          onClick={simulateSchedule}
        >
          Simulate manifest
        </button>
        <button type="button" onClick={() => loadManifest(riskyManifest)}>
          Restore conflict sample
        </button>
        <button type="button" onClick={() => loadManifest(clearManifest)}>
          Load clear sample
        </button>
        <button type="button" onClick={() => loadManifest(vercelManifest)}>
          Load vercel.json
        </button>
        <button type="button" onClick={() => loadManifest("")}>
          Clear
        </button>
      </div>

      <div className="result-region" aria-live="polite">
        {error ? (
          <div className="input-error" role="alert">
            <strong>SIMULATION STOPPED</strong>
            <span>{error}</span>
            <button type="button" onClick={() => loadManifest(riskyManifest)}>
              Restore the example manifest
            </button>
          </div>
        ) : null}
        {!result && !error ? (
          <div className="awaiting-state">
            <span>TIMETABLE NOT SIMULATED</span>
            <p>
              The supplied sample contains a three-job burst, self-overlap, a
              duplicate, and invalid syntax.
            </p>
          </div>
        ) : null}
        {result ? (
          <div className={`simulation-result ${result.releaseState}`}>
            <header className="result-header">
              <div>
                <span>RELEASE SIGNAL</span>
                <strong>{result.releaseState.toUpperCase()}</strong>
              </div>
              <p>{stateCopy(result)}</p>
            </header>

            <dl className="summary-strip">
              <div>
                <dt>Jobs</dt>
                <dd>{result.summary.jobs}</dd>
              </div>
              <div>
                <dt>Starts</dt>
                <dd>{result.summary.totalRuns.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Start collisions</dt>
                <dd>{result.summary.simultaneousMinutes}</dd>
              </div>
              <div>
                <dt>Overlap minutes</dt>
                <dd>{result.summary.overlappingMinutes.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Peak starts</dt>
                <dd>{result.summary.peakStarts}</dd>
              </div>
              <div>
                <dt>Peak active</dt>
                <dd>{result.summary.peakConcurrent}</dd>
              </div>
            </dl>

            <section className="load-board" aria-labelledby="load-board-title">
              <div className="section-label">
                <h3 id="load-board-title">UTC load board</h3>
                <span>cell = one hour / tone = peak active jobs</span>
              </div>
              <div className="load-scroll">
                <div className="hour-axis" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <span key={hour}>{String(hour).padStart(2, "0")}</span>
                  ))}
                </div>
                {dates.map((date) => (
                  <div className="day-rail" key={date}>
                    <b>{date.slice(5)}</b>
                    {result.hours
                      .filter((hour) => hour.date === date)
                      .map((hour) => (
                        <span
                          key={`${date}-${hour.hour}`}
                          className={`load-cell load-${Math.min(hour.peakConcurrent, 4)}`}
                          title={`${date} ${String(hour.hour).padStart(2, "0")}:00 UTC · ${hour.starts} starts · peak ${hour.peakConcurrent} active`}
                        >
                          {hour.starts || "·"}
                        </span>
                      ))}
                  </div>
                ))}
              </div>
            </section>

            <section
              className="job-register"
              aria-labelledby="job-register-title"
            >
              <div className="section-label">
                <h3 id="job-register-title">Job register</h3>
                <span>
                  {result.summary.assumedRuntimeMinutes.toLocaleString()}{" "}
                  assumed runtime minutes
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Job / owner</th>
                      <th>Schedule</th>
                      <th>Duration</th>
                      <th>Runs</th>
                      <th>Protected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.jobs.map((job) => (
                      <tr key={`${job.sourceIndex}-${job.name}`}>
                        <td>
                          <strong>{job.name}</strong>
                          <small>{job.owner || "unassigned"}</small>
                        </td>
                        <td>
                          <code>{job.schedule}</code>
                        </td>
                        <td>
                          {job.durationMinutes}m
                          {job.durationDefaulted ? (
                            <small> default</small>
                          ) : null}
                        </td>
                        <td>{job.runCount.toLocaleString()}</td>
                        <td>{job.protected ? "confirmed" : "unconfirmed"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section
              className="finding-register"
              aria-labelledby="finding-register-title"
            >
              <div className="section-label">
                <h3 id="finding-register-title">Release findings</h3>
                <span>{result.findings.length} findings</span>
              </div>
              {result.findings.length === 0 ? (
                <p className="clear-note">
                  No timing or planning findings in the simulated horizon.
                </p>
              ) : (
                <ol>
                  {result.findings.map((finding, index) => (
                    <li key={`${finding.rule}-${finding.job}-${index}`}>
                      <span className={`severity ${finding.severity}`}>
                        {finding.severity}
                      </span>
                      <code>{finding.rule}</code>
                      <div>
                        <strong>{finding.message}</strong>
                        <small>
                          {finding.job ? `${finding.job} · ` : ""}
                          {finding.repair}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className="outputs">
              <article>
                <div>
                  <span>finding-report.csv</span>
                  <button
                    type="button"
                    onClick={() => void copyOutput("report", reportOutput)}
                  >
                    {copyState === "report" ? "Copied" : "Copy finding report"}
                  </button>
                </div>
                <pre>{reportOutput}</pre>
              </article>
              <article>
                <div>
                  <span>cron-overlap.json</span>
                  <button
                    type="button"
                    onClick={() => void copyOutput("artifact", artifactOutput)}
                  >
                    {copyState === "artifact" ? "Copied" : "Copy audit JSON"}
                  </button>
                </div>
                <pre>{artifactOutput}</pre>
              </article>
            </div>
            {copyError ? (
              <p className="copy-error" role="alert">
                {copyError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
