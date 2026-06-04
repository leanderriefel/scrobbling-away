import { useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/utils/format";

import { useDashboardSnapshot } from "./dashboard-context";
import { SectionTitle } from "./section-title";

export function ListeningClock() {
  const buckets = useDashboardSnapshot().derived.scrobblesByHour;
  const max = useMemo(() => Math.max(1, ...buckets.map((b) => b.count)), [buckets]);

  const normalized = Array.from({ length: 24 }, (_, hour) => {
    const label = hour.toString().padStart(2, "0");
    const bucket = buckets.find((b) => b.label === label);

    return { label, count: bucket?.count ?? 0 };
  });

  return (
    <div className="grid gap-5">
      <SectionTitle description="Scrobbles grouped by the hour they were played.">
        When you listen
      </SectionTitle>
      <div className="flex h-36 items-end gap-[3px]">
        {normalized.map((bucket, index) => {
          const ratio = bucket.count / max;
          const height = Math.max(3, ratio * 100);
          const opacity = bucket.count === 0 ? 0.06 : 0.18 + ratio * 0.82;

          return (
            <Tooltip key={bucket.label}>
              <TooltipTrigger
                render={<div className="flex h-full flex-1 items-end" tabIndex={0} />}
              >
                <div
                  className="chart-bar w-full rounded-t-sm bg-primary transition-opacity duration-200 hover:!opacity-100"
                  style={{
                    height: `${height}%`,
                    opacity,
                    animationDelay: `${index * 25}ms`,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {bucket.label}:00 · {formatNumber(bucket.count)} scrobbles
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground/60">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </div>
  );
}
