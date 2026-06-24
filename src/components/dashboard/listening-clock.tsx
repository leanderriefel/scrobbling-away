import { useMemo } from "react";

import { cn } from "@/lib/utils";
import type { LastFmStatsSnapshot, TimeBucket } from "@/lib/lastfm-stats-cache";
import { formatNumber } from "@/utils/format";

import { ChartBar } from "./analytics/chart-bar";
import { useOptionalDashboardSnapshot } from "./dashboard-context";
import { SectionTitle } from "./section-title";

type ListeningClockProps = {
  buckets?: TimeBucket[];
  compact?: boolean;
  showTitle?: boolean;
  snapshot?: LastFmStatsSnapshot;
};

export const ListeningClock = ({
  buckets: bucketsProp,
  compact = false,
  showTitle = true,
  snapshot: snapshotProp,
}: ListeningClockProps = {}) => {
  const contextSnapshot = useOptionalDashboardSnapshot();
  const snapshot = snapshotProp ?? contextSnapshot;

  if (!snapshot && !bucketsProp) {
    throw new Error("ListeningClock requires a snapshot prop or DashboardProvider.");
  }

  const buckets = bucketsProp ?? snapshot!.derived.scrobblesByHour;
  const max = useMemo(() => Math.max(1, ...buckets.map((bucket) => bucket.count)), [buckets]);

  const normalized = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => {
        const label = hour.toString().padStart(2, "0");
        const bucket = buckets.find((entry) => entry.label === label);

        return { label, count: bucket?.count ?? 0 };
      }),
    [buckets],
  );

  const ratios = useMemo(() => normalized.map((bucket) => bucket.count / max), [normalized, max]);

  const chart = (
    <>
      <div className={cn("flex items-end gap-[3px]", compact ? "h-28" : "h-36")}>
        {normalized.map((bucket, index) => (
          <div key={bucket.label} className="relative flex h-full flex-1 items-end">
            <ChartBar
              value={ratios[index] ?? 0}
              leftValue={ratios[index - 1]}
              rightValue={ratios[index + 1]}
              className="animate-bar-grow origin-bottom motion-reduce:animate-none bg-chart-1"
              animationDelayMs={index * 25}
              tooltip={`${bucket.label}:00 · ${formatNumber(bucket.count)} scrobbles`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground/60">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </>
  );

  if (compact) {
    return <div className="grid gap-3">{chart}</div>;
  }

  return (
    <div className="grid gap-5">
      {showTitle && (
        <SectionTitle
          variant="subsection"
          description="Scrobbles grouped by the hour they were played."
        >
          When you listen
        </SectionTitle>
      )}
      {chart}
    </div>
  );
};
