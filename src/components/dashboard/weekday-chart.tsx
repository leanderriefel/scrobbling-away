import { useMemo } from "react";

import { cn } from "@/lib/utils";
import type { LastFmStatsSnapshot, TimeBucket } from "@/lib/lastfm-stats-cache";
import { formatNumber } from "@/utils/format";

import { ChartBar } from "./analytics/chart-bar";
import { useOptionalDashboardSnapshot } from "./dashboard-context";
import { SectionTitle } from "./section-title";

export const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type WeekdayChartProps = {
  buckets?: TimeBucket[];
  compact?: boolean;
  snapshot?: LastFmStatsSnapshot;
};

export const WeekdayChart = ({
  buckets: bucketsProp,
  compact = false,
  snapshot: snapshotProp,
}: WeekdayChartProps = {}) => {
  const contextSnapshot = useOptionalDashboardSnapshot();
  const snapshot = snapshotProp ?? contextSnapshot;

  if (!snapshot && !bucketsProp) {
    throw new Error("WeekdayChart requires a snapshot prop or DashboardProvider.");
  }

  const buckets = bucketsProp ?? snapshot!.derived.scrobblesByWeekday;
  const ordered = useMemo(
    () =>
      WEEKDAY_ORDER.map((label) => ({
        count: buckets.find((bucket) => bucket.label === label)?.count ?? 0,
        label,
      })),
    [buckets],
  );
  const max = useMemo(() => Math.max(1, ...ordered.map((bucket) => bucket.count)), [ordered]);

  const ratios = useMemo(() => ordered.map((bucket) => bucket.count / max), [ordered, max]);

  const chart = (
    <>
      <div className={cn("flex items-end gap-[3px]", compact ? "h-28" : "h-36")}>
        {ordered.map((bucket, index) => (
          <div key={bucket.label} className="relative flex h-full flex-1 items-end">
            <ChartBar
              value={ratios[index] ?? 0}
              leftValue={ratios[index - 1]}
              rightValue={ratios[index + 1]}
              className="animate-bar-grow origin-bottom motion-reduce:animate-none bg-chart-1"
              animationDelayMs={index * 40}
              tooltip={`${bucket.label} · ${formatNumber(bucket.count)} scrobbles`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[3px] font-mono text-[11px] text-muted-foreground/60">
        {ordered.map((bucket) => (
          <span key={bucket.label} className="flex-1 text-center">
            {bucket.label}
          </span>
        ))}
      </div>
    </>
  );

  if (compact) {
    return <div className="grid gap-3">{chart}</div>;
  }

  return (
    <div className="grid min-w-0 gap-5">
      <SectionTitle variant="subsection" description="Scrobbles grouped by weekday.">
        By day
      </SectionTitle>
      {chart}
    </div>
  );
};
