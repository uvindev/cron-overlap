import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseCronExpression } from "@/lib/cron/parser";
import {
  findingReportCsv,
  parsePlannerManifest,
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

const at = (value: string) => new Date(value);

function enriched(jobs: unknown[]): string {
  return JSON.stringify({ jobs });
}

function job(overrides: Record<string, unknown> = {}) {
  return {
    name: "job-a",
    path: "/api/cron/a",
    schedule: "0 8 * * *",
    durationMinutes: 10,
    owner: "platform",
    protected: true,
    ...overrides,
  };
}

describe("cron expression parser", () => {
  it("matches every minute", () => {
    expect(
      parseCronExpression("* * * * *").matches(at("2026-08-03T12:34:00Z")),
    ).toBe(true);
  });

  it("matches an exact UTC time", () => {
    const matcher = parseCronExpression("5 9 * * *");
    expect(matcher.matches(at("2026-08-03T09:05:00Z"))).toBe(true);
    expect(matcher.matches(at("2026-08-03T09:06:00Z"))).toBe(false);
  });

  it("matches step values", () => {
    const matcher = parseCronExpression("*/15 * * * *");
    expect(matcher.matches(at("2026-08-03T09:30:00Z"))).toBe(true);
    expect(matcher.matches(at("2026-08-03T09:31:00Z"))).toBe(false);
  });

  it("matches lists and ranges", () => {
    const matcher = parseCronExpression("0 8-10,14 * * *");
    expect(matcher.matches(at("2026-08-03T10:00:00Z"))).toBe(true);
    expect(matcher.matches(at("2026-08-03T11:00:00Z"))).toBe(false);
  });

  it("matches month and weekday names", () => {
    const matcher = parseCronExpression("0 8 * AUG MON");
    expect(matcher.matches(at("2026-08-03T08:00:00Z"))).toBe(true);
  });

  it("accepts seven as Sunday", () => {
    const matcher = parseCronExpression("0 8 * * 7");
    expect(matcher.matches(at("2026-08-09T08:00:00Z"))).toBe(true);
  });

  it("accepts a complete zero-through-seven weekday range", () => {
    const matcher = parseCronExpression("0 8 * * 0-7");
    expect(matcher.matches(at("2026-08-03T08:00:00Z"))).toBe(true);
    expect(matcher.matches(at("2026-08-09T08:00:00Z"))).toBe(true);
  });

  it("accepts weekday names that contain W", () => {
    const matcher = parseCronExpression("0 8 * * WED");
    expect(matcher.matches(at("2026-08-05T08:00:00Z"))).toBe(true);
  });

  it("uses standard day-of-month or weekday semantics", () => {
    const matcher = parseCronExpression("0 8 4 * MON");
    expect(matcher.matches(at("2026-08-03T08:00:00Z"))).toBe(true);
    expect(matcher.matches(at("2026-08-04T08:00:00Z"))).toBe(true);
  });

  it("treats a stepped wildcard as wildcard day syntax", () => {
    const matcher = parseCronExpression("0 8 */2 * MON");
    expect(matcher.matches(at("2026-08-03T08:00:00Z"))).toBe(true);
    expect(matcher.matches(at("2026-08-10T08:00:00Z"))).toBe(false);
  });

  it("rejects a seconds field", () => {
    expect(() => parseCronExpression("0 0 8 * * *")).toThrow("exactly five");
  });

  it("rejects an invalid step", () => {
    expect(() => parseCronExpression("*/0 * * * *")).toThrow("invalid step");
  });

  it("rejects an empty list value", () => {
    expect(() => parseCronExpression("0,,5 8 * * *")).toThrow("empty value");
  });

  it("rejects Quartz extensions", () => {
    expect(() => parseCronExpression("0 8 L * *")).toThrow(
      "unsupported syntax",
    );
  });

  it("rejects wrapping ranges", () => {
    expect(() => parseCronExpression("0 22-2 * * *")).toThrow("wrapping range");
  });
});

describe("manifest parsing", () => {
  it("parses enriched planning metadata", () => {
    expect(parsePlannerManifest(enriched([job()]))[0]).toMatchObject({
      name: "job-a",
      durationMinutes: 10,
      owner: "platform",
      protected: true,
      durationDefaulted: false,
    });
  });

  it("adds explicit planning defaults to Vercel entries", () => {
    expect(parsePlannerManifest(vercelManifest)[0]).toMatchObject({
      durationMinutes: 5,
      owner: "unassigned",
      protected: false,
      durationDefaulted: true,
    });
  });

  it("rejects malformed JSON", () => {
    expect(() => parsePlannerManifest("{")).toThrow(PlannerInputError);
  });

  it("rejects more than 25 jobs", () => {
    expect(() =>
      parsePlannerManifest(
        enriched(
          Array.from({ length: 26 }, (_, index) =>
            job({ name: `job-${index}`, path: `/api/${index}` }),
          ),
        ),
      ),
    ).toThrow("Too big");
  });
});

describe("manifest simulation", () => {
  it("marks the clear sample clear", () => {
    const result = simulateManifest({
      manifestText: clearManifest,
      startDate: defaultStartDate,
      horizonDays: 7,
    });
    expect(result.releaseState).toBe("clear");
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toMatchObject({
      jobs: 4,
      totalRuns: 22,
      simultaneousMinutes: 0,
      overlappingMinutes: 0,
      peakConcurrent: 1,
    });
  });

  it("marks the conflict sample with every intended rule family", () => {
    const result = simulateManifest({
      manifestText: riskyManifest,
      startDate: defaultStartDate,
      horizonDays: 7,
    });
    const rules = new Set(result.findings.map((finding) => finding.rule));
    expect(result.releaseState).toBe("conflict");
    expect([...rules]).toEqual(
      expect.arrayContaining([
        "CRO002",
        "CRO003",
        "CRO004",
        "CRO006",
        "CRO007",
        "CRO008",
        "CRO009",
        "CRO010",
        "CRO011",
      ]),
    );
  });

  it("detects an exact two-job start collision", () => {
    const result = simulateManifest({
      manifestText: enriched([
        job(),
        job({ name: "job-b", path: "/api/cron/b" }),
      ]),
      startDate: defaultStartDate,
      horizonDays: 7,
    });
    expect(result.findings.some((finding) => finding.rule === "CRO005")).toBe(
      true,
    );
  });

  it("detects self-overlap", () => {
    const result = simulateManifest({
      manifestText: enriched([
        job({ schedule: "*/2 * * * *", durationMinutes: 3 }),
      ]),
      startDate: defaultStartDate,
      horizonDays: 7,
    });
    expect(result.findings.some((finding) => finding.rule === "CRO008")).toBe(
      true,
    );
  });

  it("marks a plain single Vercel job for planning review", () => {
    const result = simulateManifest({
      manifestText: JSON.stringify({
        crons: [{ path: "/api/cron/a", schedule: "0 8 * * *" }],
      }),
      startDate: defaultStartDate,
      horizonDays: 7,
    });
    expect(result.releaseState).toBe("review");
    expect(result.findings.map((finding) => finding.rule)).toEqual([
      "CRO010",
      "CRO011",
      "CRO012",
    ]);
  });

  it("doubles daily run counts for a 14-day horizon", () => {
    const result = simulateManifest({
      manifestText: enriched([job()]),
      startDate: defaultStartDate,
      horizonDays: 14,
    });
    expect(result.jobs[0].runCount).toBe(14);
  });

  it("rejects an impossible reference date", () => {
    expect(() =>
      simulateManifest({
        manifestText: clearManifest,
        startDate: "2026-02-31",
        horizonDays: 7,
      }),
    ).toThrow(z.ZodError);
  });

  it("rejects an empty manifest", () => {
    expect(() =>
      simulateManifest({
        manifestText: "",
        startDate: defaultStartDate,
        horizonDays: 7,
      }),
    ).toThrow("Paste a cron manifest");
  });
});

describe("exports", () => {
  const result = simulateManifest({
    manifestText: riskyManifest,
    startDate: defaultStartDate,
    horizonDays: 7,
  });

  it("quotes finding report cells", () => {
    const report = findingReportCsv(result);
    expect(report.split("\n")[0]).toBe("rule,severity,job,message,repair");
    expect(report).toContain('"CRO006","critical"');
  });

  it("exports assumptions without the raw manifest", () => {
    const artifact = simulationArtifact(result);
    expect(artifact).toContain('"releaseState": "conflict"');
    expect(artifact).toContain('"assumedDurationMinutes"');
    expect(artifact).not.toContain('"manifestText"');
  });
});
