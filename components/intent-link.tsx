"use client";

import type { ReactNode } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

export function IntentLink({
  event,
  href,
  children,
  className,
}: {
  event: AnalyticsEvent;
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={href} onClick={() => track(event)}>
      {children}
    </a>
  );
}
