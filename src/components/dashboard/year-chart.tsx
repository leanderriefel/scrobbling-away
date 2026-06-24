import { useMemo } from "react";

import { cn } from "@/lib/utils";
import type { LastFmStatsSnapshot, TimeBucket } from "@/lib/lastfm-stats-cache";
import { formatNumber } from "@/utils/format";

import { ChartBar } from "./analytics/chart-bar";
import { useOptionalDashboardSnapshot } from "./dashboard-context";
import { EmptyState } from "./empty-state";
import { SectionTitle } from "./section-title";

type YearChartProps = {
  buckets?: TimeBucket[];
  compact?: boolean;
  snapshot?: LastFmStatsSnapshot;
};

export const YearChart = ({
  buckets: bucketsProp,
  compact = false,
  snapshot: snapshotProp,
}: YearChartProps = {}) => {
  const contextSnapshot = useOptionalDashboardSnapshot();
  const snapshot = snapshotProp ?? contextSnapshot;

  if (!snapshot && !bucketsProp) {
    throw new Error("YearChart requires a snapshot prop or DashboardProvider.");
  }

  const buckets = bucketsProp ?? snapshot!.derived.scrobblesByYear;
  const max = useMemo(() => Math.max(1, ...buckets.map((bucket) => bucket.count)), [buckets]);

  if (buckets.length === 0) {
    if (compact) {
      return (
        <div className="py-4 text-center text-xs text-muted-foreground">No yearly data yet</div>
      );
    }

    return (
      <div className="grid gap-5">
        <SectionTitle
          variant="subsection"
          description="Scrobbles grouped by calendar year from account creation through today."
        >
          By year
        </SectionTitle>
        <EmptyState message="No yearly data yet" />
      </div>
    );
  }

  const ratios = useMemo(() => buckets.map((bucket) => bucket.count / max), [buckets, max]);

  const chart = (
    <>
      <div className={cn("flex items-end gap-1", compact ? "h-24" : "h-28")}>
        {buckets.map((bucket, index) => (
          <div key={bucket.label} className="relative flex h-full flex-1 items-end">
            <ChartBar
              value={ratios[index] ?? 0}
              leftValue={ratios[index - 1]}
              rightValue={ratios[index + 1]}
              minHeightPercent={6}
              className="animate-bar-grow origin-bottom motion-reduce:animate-none bg-chart-1"
              animationDelayMs={index * 40}
              tooltip={`${bucket.label} · ${formatNumber(bucket.count)} scrobbles`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground/60">
        <span>{buckets[0]?.label}</span>
        <span>{buckets.at(-1)?.label}</span>
      </div>
    </>
  );

  if (compact) {
    return <div className="grid gap-3">{chart}</div>;
  }

  return (
    <div className="grid min-w-0 gap-5">
      <SectionTitle
        variant="subsection"
        description="Scrobbles grouped by calendar year from account creation through today."
      >
        By year
      </SectionTitle>
      {chart}
    </div>
  );
};
