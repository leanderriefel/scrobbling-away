import type { ListeningSessionStats, SessionBucket } from "@/lib/listening-analytics";
import { formatCompact, formatNumber, formatPercent } from "@/utils/format";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { AnalyticsPanel } from "./analytics-panel";
import { EmptyChart } from "./empty-chart";
import { formatMinutes, oneDecimalFormatter } from "./formatters";
import { Metric } from "./metric";

export function ListeningSessions({ analytics }: { analytics: ListeningSessionStats }) {
  return (
    <AnalyticsPanel
      title="Listening sessions"
      description="A group of scrobbles separated by less than 45 minutes."
    >
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Sessions"
          value={formatNumber(analytics.totalSessions)}
          help="A group of scrobbles separated by less than 45 minutes."
        />
        <Metric
          label="Avg duration"
          value={formatMinutes(analytics.averageDurationMinutes)}
          help="Time between the first and last play in a session."
        />
        <Metric
          label="Tracks/session"
          value={oneDecimalFormatter.format(analytics.averageTracks)}
          help="Number of scrobbles inside each listening session."
        />
        <Metric
          label="Session focus"
          value={formatPercent(analytics.averageFocus)}
          help="Share of a session belonging to its top artist. Formula: top artist scrobbles / session scrobbles."
        />
      </div>
      <DurationBuckets buckets={analytics.durationBuckets} />
    </AnalyticsPanel>
  );
}

function DurationBuckets({ buckets }: { buckets: SessionBucket[] }) {
  if (buckets.length === 0) return <EmptyChart />;

  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <div className="grid gap-2">
      {buckets.map((bucket) => (
        <div
          key={bucket.label}
          className="grid grid-cols-[3rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs"
        >
          <span className="font-mono text-muted-foreground">{bucket.label}</span>
          <Tooltip>
            <TooltipTrigger
              render={<div className="h-1.5 overflow-hidden rounded-sm bg-muted/60" tabIndex={0} />}
            >
              <div
                className="h-full rounded-sm bg-primary"
                style={{ width: `${(bucket.count / max) * 100}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {bucket.label} · {formatNumber(bucket.count)} sessions
            </TooltipContent>
          </Tooltip>
          <span className="text-right font-mono text-muted-foreground">
            {formatCompact(bucket.count)}
          </span>
        </div>
      ))}
    </div>
  );
}
