import { z } from "zod";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const plannerInputSchema = z.object({
  manifestText: z
    .string()
    .trim()
    .min(1, "Paste a cron manifest before running the simulation.")
    .max(500_000, "The manifest exceeds the 500,000 character limit."),
  startDate: z
    .string()
    .regex(isoDate, "Use a UTC start date in YYYY-MM-DD format.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, "Use a real calendar date."),
  horizonDays: z.union([z.literal(7), z.literal(14)]),
});

export const planningJobSchema = z.object({
  name: z.string().trim().min(1).max(100),
  path: z.string().trim().min(1).max(300),
  schedule: z.string().trim().min(1).max(120),
  durationMinutes: z.number().int().min(1).max(1_440),
  owner: z.string().trim().max(100),
  protected: z.boolean(),
});

export const enrichedManifestSchema = z.object({
  jobs: z.array(planningJobSchema).min(1).max(25),
});

export const vercelManifestSchema = z.object({
  crons: z
    .array(
      z.object({
        path: z.string().trim().min(1).max(300),
        schedule: z.string().trim().min(1).max(120),
      }),
    )
    .min(1)
    .max(25),
});

export type PlannerInput = z.infer<typeof plannerInputSchema>;
