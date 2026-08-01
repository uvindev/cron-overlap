export type Severity = "critical" | "high" | "medium";
export type ReleaseState = "conflict" | "review" | "clear";

export type PlanningJob = {
  name: string;
  path: string;
  schedule: string;
  durationMinutes: number;
  owner: string;
  protected: boolean;
  sourceIndex: number;
  durationDefaulted: boolean;
};

export type Finding = {
  rule: string;
  severity: Severity;
  job: string | null;
  message: string;
  repair: string;
};

export type StartCollision = {
  timestampUtc: string;
  jobs: string[];
};

export type JobSummary = PlanningJob & {
  runCount: number;
  averageRunsPerDay: number;
};

export type HourCell = {
  date: string;
  hour: number;
  starts: number;
  peakConcurrent: number;
};

export type SimulationSummary = {
  jobs: number;
  totalRuns: number;
  simultaneousMinutes: number;
  overlappingMinutes: number;
  peakStarts: number;
  peakConcurrent: number;
  assumedRuntimeMinutes: number;
};

export type SimulationResult = {
  version: 1;
  releaseState: ReleaseState;
  startDate: string;
  horizonDays: 7 | 14;
  summary: SimulationSummary;
  jobs: JobSummary[];
  findings: Finding[];
  startCollisions: StartCollision[];
  hours: HourCell[];
};
