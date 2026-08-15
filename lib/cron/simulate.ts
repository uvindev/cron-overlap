/**
 * @project  CronOverlap — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import {
  enrichedManifestSchema,
  plannerInputSchema,
  vercelManifestSchema,
  type PlannerInput,
} from "@/lib/schemas/planner";
import { CronExpressionError, parseCronExpression } from "./parser";
import type {
  Finding,
  HourCell,
  PlanningJob,
  ReleaseState,
  Severity,
  SimulationResult,
} from "./types";

const severityRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

export class PlannerInputError extends Error {}

function issueMessage(error: { issues: { message: string }[] }): string {
  return (
    error.issues[0]?.message ??
    "The manifest does not match the required shape."
  );
}

export function parsePlannerManifest(manifestText: string): PlanningJob[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestText);
  } catch {
    throw new PlannerInputError(
      "The manifest is not valid JSON. Repair the syntax and run it again.",
    );
  }

  const enriched = enrichedManifestSchema.safeParse(parsed);
  if (enriched.success) {
    return enriched.data.jobs.map((job, sourceIndex) => ({
      ...job,
      sourceIndex,
      durationDefaulted: false,
    }));
  }

  const vercel = vercelManifestSchema.safeParse(parsed);
  if (vercel.success) {
    return vercel.data.crons.map((cron, sourceIndex) => ({
      name:
        cron.path.split("/").filter(Boolean).at(-1) ?? `job-${sourceIndex + 1}`,
      path: cron.path,
      schedule: cron.schedule,
      durationMinutes: 5,
      owner: "unassigned",
      protected: false,
      sourceIndex,
      durationDefaulted: true,
    }));
  }

  const hasJobs =
    typeof parsed === "object" && parsed !== null && "jobs" in parsed;
  throw new PlannerInputError(
    hasJobs ? issueMessage(enriched.error) : issueMessage(vercel.error),
  );
}

function addFinding(findings: Finding[], finding: Finding): void {
  findings.push(finding);
}

function formatMinute(start: Date, minuteIndex: number): string {
  return new Date(start.getTime() + minuteIndex * 60_000).toISOString();
}

function releaseState(findings: Finding[]): ReleaseState {
  if (findings.some((finding) => finding.severity !== "medium"))
    return "conflict";
  if (findings.length > 0) return "review";
  return "clear";
}

export function simulateManifest(rawInput: PlannerInput): SimulationResult {
  const input = plannerInputSchema.parse(rawInput);
  const jobs = parsePlannerManifest(input.manifestText);
  const findings: Finding[] = [];
  const start = new Date(`${input.startDate}T00:00:00.000Z`);
  const horizonMinutes = input.horizonDays * 1_440;
  const matchers = jobs.map((job) => {
    if (!job.path.startsWith("/")) {
      addFinding(findings, {
        rule: "CRO003",
        severity: "critical",
        job: job.name,
        message: `Endpoint path "${job.path}" does not start with /.`,
        repair: "Use an absolute route path such as /api/cron/sync.",
      });
    }

    try {
      return parseCronExpression(job.schedule);
    } catch (error) {
      addFinding(findings, {
        rule: "CRO002",
        severity: "critical",
        job: job.name,
        message:
          error instanceof CronExpressionError
            ? error.message
            : "The cron expression could not be parsed.",
        repair:
          "Use standard five-field Vercel cron syntax without Quartz extensions.",
      });
      return null;
    }
  });

  const exactJobs = new Map<string, number[]>();
  jobs.forEach((job, index) => {
    const key = `${job.path}\u0000${job.schedule}`;
    exactJobs.set(key, [...(exactJobs.get(key) ?? []), index]);

    if (!job.owner || job.owner.toLowerCase() === "unassigned") {
      addFinding(findings, {
        rule: "CRO010",
        severity: "medium",
        job: job.name,
        message: "No release owner is assigned to this job.",
        repair:
          "Name the team or person responsible for timing and failure review.",
      });
    }
    if (!job.protected) {
      addFinding(findings, {
        rule: "CRO011",
        severity: "medium",
        job: job.name,
        message: "Endpoint protection is unconfirmed in the planning manifest.",
        repair:
          "Confirm CRON_SECRET authorization in the deployed handler and runtime tests.",
      });
    }
    if (job.durationDefaulted) {
      addFinding(findings, {
        rule: "CRO012",
        severity: "medium",
        job: job.name,
        message: "The simulation uses the five-minute default duration.",
        repair: "Use an enriched manifest with a measured planning duration.",
      });
    }
  });

  for (const indexes of exactJobs.values()) {
    if (indexes.length < 2) continue;
    addFinding(findings, {
      rule: "CRO004",
      severity: "high",
      job: indexes.map((index) => jobs[index].name).join(", "),
      message: `${indexes.length} jobs repeat the same endpoint and schedule.`,
      repair:
        "Keep one invocation or document why the duplicate call is intentional.",
    });
  }

  const startMap = new Map<number, number[]>();
  const runCounts = new Array<number>(jobs.length).fill(0);
  const activity = jobs.map(() => new Int16Array(horizonMinutes + 1));

  for (let minuteIndex = 0; minuteIndex < horizonMinutes; minuteIndex += 1) {
    const date = new Date(start.getTime() + minuteIndex * 60_000);
    matchers.forEach((matcher, jobIndex) => {
      if (!matcher?.matches(date)) return;
      runCounts[jobIndex] += 1;
      startMap.set(minuteIndex, [
        ...(startMap.get(minuteIndex) ?? []),
        jobIndex,
      ]);
      activity[jobIndex][minuteIndex] += 1;
      activity[jobIndex][
        Math.min(minuteIndex + jobs[jobIndex].durationMinutes, horizonMinutes)
      ] -= 1;
    });
  }

  const startCollisions = [...startMap.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([minuteIndex, indexes]) => ({
      timestampUtc: formatMinute(start, minuteIndex),
      jobs: indexes.map((index) => jobs[index].name),
    }));

  const burstStarts = startCollisions.filter(
    (collision) => collision.jobs.length >= 3,
  );
  const pairStarts = startCollisions.filter(
    (collision) => collision.jobs.length === 2,
  );

  if (burstStarts.length > 0) {
    addFinding(findings, {
      rule: "CRO006",
      severity: "critical",
      job: null,
      message: `${burstStarts.length} simulated minutes start three or more jobs together.`,
      repair: `Review the first burst at ${burstStarts[0].timestampUtc} and stagger only where business timing permits.`,
    });
  }
  if (pairStarts.length > 0) {
    addFinding(findings, {
      rule: "CRO005",
      severity: "high",
      job: null,
      message: `${pairStarts.length} simulated minutes start exactly two jobs together.`,
      repair: `Review the first pair at ${pairStarts[0].timestampUtc} and confirm shared dependency capacity.`,
    });
  }

  const active = new Array<number>(jobs.length).fill(0);
  const pairOverlapMinutes = new Map<string, number>();
  const selfOverlapMinutes = new Array<number>(jobs.length).fill(0);
  const hours: HourCell[] = [];
  let overlappingMinutes = 0;
  let peakConcurrent = 0;
  let currentHour = -1;

  for (let minuteIndex = 0; minuteIndex < horizonMinutes; minuteIndex += 1) {
    let concurrent = 0;
    const activeIndexes: number[] = [];
    jobs.forEach((_, jobIndex) => {
      active[jobIndex] += activity[jobIndex][minuteIndex];
      concurrent += active[jobIndex];
      if (active[jobIndex] > 0) activeIndexes.push(jobIndex);
      if (active[jobIndex] > 1) selfOverlapMinutes[jobIndex] += 1;
    });

    if (concurrent > 1) overlappingMinutes += 1;
    peakConcurrent = Math.max(peakConcurrent, concurrent);

    for (let left = 0; left < activeIndexes.length; left += 1) {
      for (let right = left + 1; right < activeIndexes.length; right += 1) {
        const key = `${activeIndexes[left]}:${activeIndexes[right]}`;
        pairOverlapMinutes.set(key, (pairOverlapMinutes.get(key) ?? 0) + 1);
      }
    }

    const hourIndex = Math.floor(minuteIndex / 60);
    if (hourIndex !== currentHour) {
      currentHour = hourIndex;
      const date = new Date(start.getTime() + minuteIndex * 60_000);
      hours.push({
        date: date.toISOString().slice(0, 10),
        hour: date.getUTCHours(),
        starts: 0,
        peakConcurrent: concurrent,
      });
    }
    const hour = hours[hours.length - 1];
    hour.starts += startMap.get(minuteIndex)?.length ?? 0;
    hour.peakConcurrent = Math.max(hour.peakConcurrent, concurrent);
  }

  for (const [key, minutes] of pairOverlapMinutes) {
    const [left, right] = key.split(":").map(Number);
    addFinding(findings, {
      rule: "CRO007",
      severity: "high",
      job: `${jobs[left].name}, ${jobs[right].name}`,
      message: `Their assumed execution windows overlap for ${minutes} simulated minutes.`,
      repair:
        "Confirm downstream capacity, idempotency, and whether either start can move.",
    });
  }

  selfOverlapMinutes.forEach((minutes, jobIndex) => {
    if (minutes === 0) return;
    addFinding(findings, {
      rule: "CRO008",
      severity: "high",
      job: jobs[jobIndex].name,
      message: `The job overlaps its own prior run for ${minutes} simulated minutes.`,
      repair:
        "Shorten the job, reduce frequency, or add a runtime overlap guard.",
    });
  });

  runCounts.forEach((runCount, jobIndex) => {
    const averageRunsPerDay = runCount / input.horizonDays;
    if (averageRunsPerDay > 288) {
      addFinding(findings, {
        rule: "CRO009",
        severity: "medium",
        job: jobs[jobIndex].name,
        message: `The schedule averages ${averageRunsPerDay.toFixed(1)} starts per day.`,
        repair:
          "Confirm the [TARGET] five-minute frequency boundary and compute budget.",
      });
    }
  });

  findings.sort(
    (left, right) =>
      severityRank[left.severity] - severityRank[right.severity] ||
      left.rule.localeCompare(right.rule) ||
      (left.job ?? "").localeCompare(right.job ?? ""),
  );

  const jobSummaries = jobs.map((job, jobIndex) => ({
    ...job,
    runCount: runCounts[jobIndex],
    averageRunsPerDay: runCounts[jobIndex] / input.horizonDays,
  }));

  return {
    version: 1,
    releaseState: releaseState(findings),
    startDate: input.startDate,
    horizonDays: input.horizonDays,
    summary: {
      jobs: jobs.length,
      totalRuns: runCounts.reduce((total, count) => total + count, 0),
      simultaneousMinutes: startCollisions.length,
      overlappingMinutes,
      peakStarts: Math.max(
        0,
        ...[...startMap.values()].map((value) => value.length),
      ),
      peakConcurrent,
      assumedRuntimeMinutes: jobs.reduce(
        (total, job, index) => total + job.durationMinutes * runCounts[index],
        0,
      ),
    },
    jobs: jobSummaries,
    findings,
    startCollisions: startCollisions.slice(0, 200),
    hours,
  };
}

function csvCell(value: string | number | null): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function findingReportCsv(result: SimulationResult): string {
  return [
    "rule,severity,job,message,repair",
    ...result.findings.map((finding) =>
      [
        finding.rule,
        finding.severity,
        finding.job,
        finding.message,
        finding.repair,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
}

export function simulationArtifact(result: SimulationResult): string {
  return JSON.stringify(
    {
      version: result.version,
      releaseState: result.releaseState,
      startDate: result.startDate,
      horizonDays: result.horizonDays,
      summary: result.summary,
      jobs: result.jobs.map((job) => ({
        name: job.name,
        path: job.path,
        schedule: job.schedule,
        assumedDurationMinutes: job.durationMinutes,
        owner: job.owner,
        protectionConfirmed: job.protected,
        runCount: job.runCount,
      })),
      findings: result.findings,
      startCollisions: result.startCollisions,
    },
    null,
    2,
  );
}
