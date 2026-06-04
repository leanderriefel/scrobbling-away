import { formatCompact } from "@/utils/format";

import { useDashboardSnapshot } from "./dashboard-context";
import { SectionTitle } from "./section-title";

const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekdayChart() {
  const buckets = useDashboardSnapshot().derived.scrobblesByWeekday;
  const ordered = WEEKDAY_ORDER.map((label) => ({
    count: buckets.find((b) => b.label === label)?.count ?? 0,
    label,
  }));
  const max = Math.max(1, ...ordered.map((b) => b.count));

  return (
    <div className="grid gap-5">
      <SectionTitle description="Scrobbles grouped by weekday.">By day</SectionTitle>
      <div className="grid gap-3">
        {ordered.map((bucket, index) => {
          const ratio = bucket.count / max;

          return (
            <div
              key={bucket.label}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.75rem] items-center gap-3 text-xs"
            >
              <span className="font-mono text-muted-foreground/70">{bucket.label}</span>
              <div className="h-[5px] overflow-hidden rounded-sm bg-muted/60">
                <div
                  className="chart-bar h-full rounded-sm bg-primary"
                  style={{
                    width: `${Math.max(2, ratio * 100)}%`,
                    opacity: 0.35 + ratio * 0.65,
                    animationDelay: `${index * 50}ms`,
                  }}
                />
              </div>
              <span className="text-right font-mono tabular-nums text-muted-foreground/70">
                {formatCompact(bucket.count)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
