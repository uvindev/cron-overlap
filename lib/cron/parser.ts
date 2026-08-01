/**
 * @project  CronOverlap — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  Proprietary — all rights reserved
 */

const MONTHS: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

const WEEKDAYS: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

type Field = { values: Set<number>; wildcard: boolean };

export type CronMatcher = {
  matches(date: Date): boolean;
};

export class CronExpressionError extends Error {}

function parseAtom(
  source: string,
  minimum: number,
  maximum: number,
  names?: Record<string, number>,
  sundaySeven = false,
): number {
  const normalized = source.toUpperCase();
  const namedValue = names?.[normalized];
  const value = namedValue ?? Number(normalized);
  const rawMaximum = sundaySeven ? 7 : maximum;

  if (!Number.isInteger(value) || value < minimum || value > rawMaximum) {
    throw new CronExpressionError(
      `Value "${source}" is outside ${minimum}-${rawMaximum}.`,
    );
  }

  return value;
}

function parseField(
  source: string,
  minimum: number,
  maximum: number,
  names?: Record<string, number>,
  sundaySeven = false,
): Field {
  if (
    !source ||
    source.includes("?") ||
    source.includes("#") ||
    /^(?:L|W)$/i.test(source) ||
    /\d[WL]$/i.test(source)
  ) {
    throw new CronExpressionError(`Field "${source}" uses unsupported syntax.`);
  }

  const values = new Set<number>();
  const parts = source.split(",");

  for (const part of parts) {
    if (!part) {
      throw new CronExpressionError(
        `Field "${source}" contains an empty value.`,
      );
    }
    const stepParts = part.split("/");
    if (stepParts.length > 2) {
      throw new CronExpressionError(`Field "${part}" has more than one step.`);
    }

    const [base, stepSource] = stepParts;
    const step = stepSource === undefined ? 1 : Number(stepSource);
    if (!Number.isInteger(step) || step < 1) {
      throw new CronExpressionError(`Field "${part}" has an invalid step.`);
    }

    let start = minimum;
    let end = maximum;

    if (base !== "*") {
      const range = base.split("-");
      if (range.length > 2) {
        throw new CronExpressionError(`Field "${part}" has an invalid range.`);
      }
      start = parseAtom(range[0], minimum, maximum, names, sundaySeven);
      end =
        range.length === 2
          ? parseAtom(range[1], minimum, maximum, names, sundaySeven)
          : stepSource === undefined
            ? start
            : maximum;
      if (start > end) {
        throw new CronExpressionError(`Field "${part}" uses a wrapping range.`);
      }
    }

    for (let value = start; value <= end; value += step) {
      values.add(sundaySeven && value === 7 ? 0 : value);
    }
  }

  if (values.size === 0) {
    throw new CronExpressionError(`Field "${source}" matches no values.`);
  }

  return { values, wildcard: source.startsWith("*") };
}

export function parseCronExpression(expression: string): CronMatcher {
  const fields = expression.trim().replace(/\s+/g, " ").split(" ");
  if (fields.length !== 5) {
    throw new CronExpressionError(
      "Use exactly five cron fields: minute hour day month weekday.",
    );
  }

  const minute = parseField(fields[0], 0, 59);
  const hour = parseField(fields[1], 0, 23);
  const dayOfMonth = parseField(fields[2], 1, 31);
  const month = parseField(fields[3], 1, 12, MONTHS);
  const dayOfWeek = parseField(fields[4], 0, 6, WEEKDAYS, true);

  return {
    matches(date: Date): boolean {
      const dateMatches = dayOfMonth.values.has(date.getUTCDate());
      const weekdayMatches = dayOfWeek.values.has(date.getUTCDay());
      const dayMatches =
        dayOfMonth.wildcard || dayOfWeek.wildcard
          ? dateMatches && weekdayMatches
          : dateMatches || weekdayMatches;

      return (
        minute.values.has(date.getUTCMinutes()) &&
        hour.values.has(date.getUTCHours()) &&
        month.values.has(date.getUTCMonth() + 1) &&
        dayMatches
      );
    },
  };
}
