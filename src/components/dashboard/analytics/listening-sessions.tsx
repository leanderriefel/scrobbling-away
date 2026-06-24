import type { ListeningSessionStats, SessionBucket } from "@/lib/listening-analytics";
import { formatListeningSessionGap } from "@/lib/listening-sessions";
import { chartOpacityFromCount } from "@/utils/chart-intensity";
import { formatCompact, formatNumber, formatPercent } from "@/utils/format";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { AnalyticsPanel } from "./analytics-panel";
import { EmptyChart } from "./empty-chart";
import { formatMinutes, oneDecimalFormatter } from "./formatters";
import { Metric } from "./metric";

export function ListeningSessions({ analytics }: { analytics: ListeningSessionStats }) {
  const gapLabel = formatListeningSessionGap(analytics.gapSeconds);
  const sessionGroupingHelp = `Scrobbles stay in one session until you go ${gapLabel} without a play. Tuned from your listening pauses.`;

  return (
    <AnalyticsPanel title="Listening sessions" description={sessionGroupingHelp}>
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Sessions"
          value={formatNumber(analytics.totalSessions)}
          help={sessionGroupingHelp}
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
              render={
                <div className="h-1.5 overflow-hidden rounded-md bg-chart-track" tabIndex={0} />
              }
            >
              <div
                className="h-full rounded-md bg-chart-1 transition-opacity duration-200 hover:opacity-100"
                style={{
                  width: `${(bucket.count / max) * 100}%`,
                  opacity: chartOpacityFromCount(bucket.count, max),
                }}
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
