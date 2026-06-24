import { cn } from "@/lib/utils";
import type { LastFmStatsSnapshot, TimeBucket } from "@/lib/lastfm-stats-cache";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MONTH_LABELS } from "@/utils/calendar-labels";
import { chartOpacityFromCount } from "@/utils/chart-intensity";
import { formatCompact, formatNumber } from "@/utils/format";

import { useOptionalDashboardSnapshot } from "./dashboard-context";
import { SectionTitle } from "./section-title";

type MonthChartProps = {
  buckets?: TimeBucket[];
  compact?: boolean;
  snapshot?: LastFmStatsSnapshot;
};

export const MonthChart = ({
  buckets: bucketsProp,
  compact = false,
  snapshot: snapshotProp,
}: MonthChartProps = {}) => {
  const contextSnapshot = useOptionalDashboardSnapshot();
  const snapshot = snapshotProp ?? contextSnapshot;

  if (!snapshot && !bucketsProp) {
    throw new Error("MonthChart requires a snapshot prop or DashboardProvider.");
  }

  const buckets = bucketsProp ?? snapshot!.derived.scrobblesByMonthOfYear;
  const ordered = MONTH_LABELS.map((label) => ({
    count: buckets.find((bucket) => bucket.label === label)?.count ?? 0,
    label,
  }));
  const max = Math.max(1, ...ordered.map((bucket) => bucket.count));

  const chart = (
    <div className={cn("grid gap-2.5", !compact && "sm:grid-cols-2 sm:gap-x-8")}>
      {ordered.map((bucket, index) => {
        const ratio = bucket.count / max;

        return (
          <div
            key={bucket.label}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.75rem] items-center gap-3 text-xs"
          >
            <span className="font-mono text-muted-foreground/70">{bucket.label}</span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div
                    className="h-[5px] overflow-hidden rounded-md bg-chart-track outline-none"
                    tabIndex={0}
                  />
                }
              >
                <div
                  className="animate-bar-grow origin-bottom motion-reduce:animate-none h-full rounded-md bg-chart-1 transition-opacity duration-200 hover:opacity-100"
                  style={{
                    width: `${Math.max(2, ratio * 100)}%`,
                    opacity: chartOpacityFromCount(bucket.count, max),
                    animationDelay: `${index * 40}ms`,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {bucket.label} · {formatNumber(bucket.count)} scrobbles
              </TooltipContent>
            </Tooltip>
            <span className="text-right font-mono tabular-nums text-muted-foreground/70">
              {formatCompact(bucket.count)}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (compact) {
    return chart;
  }

  return (
    <div className="grid min-w-0 gap-5">
      <SectionTitle
        variant="subsection"
        description="Scrobbles grouped by calendar month (all years combined)."
      >
        By month
      </SectionTitle>
      {chart}
    </div>
  );
};
