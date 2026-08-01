export type AnalyticsEvent =
  | "planner_viewed"
  | "manifest_simulated"
  | "collision_report_copied"
  | "team_interest"
  | "feedback_intent";

declare global {
  interface Window {
    plausible?: (event: string) => void;
  }
}

export function track(event: AnalyticsEvent): void {
  if (typeof window !== "undefined") window.plausible?.(event);
}
