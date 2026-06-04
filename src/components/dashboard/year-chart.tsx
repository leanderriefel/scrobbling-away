import { useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/utils/format";

import { useDashboardSnapshot } from "./dashboard-context";
import { EmptyState } from "./empty-state";
import { SectionTitle } from "./section-title";

export function YearChart() {
  const buckets = useDashboardSnapshot().derived.scrobblesByYear;
  const max = useMemo(() => Math.max(1, ...buckets.map((b) => b.count)), [buckets]);

  if (buckets.length === 0) {
    return (
      <div className="grid gap-5">
        <SectionTitle description="Scrobbles grouped by calendar year.">By year</SectionTitle>
        <EmptyState message="No yearly data yet" />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <SectionTitle description="Scrobbles grouped by calendar year.">By year</SectionTitle>
      <div className="flex h-28 items-end gap-1">
        {buckets.map((bucket, index) => {
          const ratio = bucket.count / max;

          return (
            <Tooltip key={bucket.label}>
              <TooltipTrigger
                render={<div className="flex h-full flex-1 items-end" tabIndex={0} />}
              >
                <div
                  className="chart-bar w-full rounded-t-sm bg-primary transition-opacity duration-200 hover:!opacity-100"
                  style={{
                    height: `${Math.max(6, ratio * 100)}%`,
                    opacity: 0.25 + ratio * 0.75,
                    animationDelay: `${index * 40}ms`,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {bucket.label} · {formatNumber(bucket.count)} scrobbles
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground/60">
        <span>{buckets[0]?.label}</span>
        <span>{buckets.at(-1)?.label}</span>
      </div>
    </div>
  );
}
