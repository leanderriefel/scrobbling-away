import type { AdvancedListeningAnalytics } from "@/lib/advanced-listening-analytics";
import { chartValueOpacity } from "@/utils/chart-intensity";
import { formatDateTime, formatPercent } from "@/utils/format";

import { Metric } from "../metric";
import { AnalyticsPanel } from "../analytics-panel";
import { MiniLabel } from "../mini-label";
import { RankedRows } from "./shared";

export function AnomalyPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["anomalies"];
}) {
  return (
    <AnalyticsPanel
      title="Unusual sessions"
      description="Sessions that differ from your typical length, track count, focus, or new-music rate."
    >
      <Metric
        label="Unusual session share"
        value={formatPercent(analytics.anomalousShare)}
        help="Share of sessions flagged as outliers."
      />
      <RankedRows
        label="Top outliers"
        help="Sessions farthest from your usual pattern."
        rows={analytics.sessions.map((session) => ({
          title: formatDateTime(session.startedAt),
          detail: session.reason,
          value: `${session.tracks} tracks`,
        }))}
      />
    </AnalyticsPanel>
  );
}

export function PhaseSpacePanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["phaseSpace"];
}) {
  const maxVolume = Math.max(0, ...analytics.points.map((point) => point.volume));

  return (
    <AnalyticsPanel
      title="Recent daily summary"
      description="Per day: play count, artist count, new-track share, and focus. Stability = how similar recent days are."
    >
      <Metric
        label="Day similarity"
        value={formatPercent(analytics.attractorStability)}
        help="How similar your recent days are to each other. Higher = less day-to-day variation."
      />
      <MiniLabel
        label="Last 10 days"
        help="Bar = play count. Right column = artist count and new-track share."
      />
      <div className="grid gap-2">
        {analytics.points.slice(-10).map((point) => (
          <div
            key={point.label}
            className="grid grid-cols-[4rem_minmax(0,1fr)_5rem] items-center gap-2 text-xs"
          >
            <span className="truncate text-muted-foreground">{point.label}</span>
            <div className="h-2 overflow-hidden rounded-md bg-chart-track">
              <div
                className="h-full rounded-md bg-chart-3"
                style={{
                  width: `${Math.max(2, (point.volume / Math.max(maxVolume, 1)) * 100)}%`,
                  opacity: chartValueOpacity(maxVolume > 0 ? point.volume / maxVolume : 0),
                }}
              />
            </div>
            <span className="text-right font-mono text-muted-foreground tabular-nums">
              {point.diversity} artists · {formatPercent(point.discoveryRate)} new
            </span>
          </div>
        ))}
      </div>
    </AnalyticsPanel>
  );
}
