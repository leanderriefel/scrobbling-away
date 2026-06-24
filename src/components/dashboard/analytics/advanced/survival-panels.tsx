import type { AdvancedListeningAnalytics } from "@/lib/advanced-listening-analytics";
import { chartValueOpacity } from "@/utils/chart-intensity";
import { formatCompact, formatPercent } from "@/utils/format";

import { oneDecimalFormatter } from "../formatters";
import { Metric } from "../metric";
import { AnalyticsPanel } from "../analytics-panel";
import { EmptyChart } from "../empty-chart";
import { MiniLabel } from "../mini-label";
import { RankedRows } from "./shared";

export function SurvivalPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["survival"];
}) {
  const maxSurvival = 1;

  return (
    <AnalyticsPanel
      title="Track replays"
      description="How long after a first scrobble tracks get replayed, and what share are never played again."
    >
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Median days to replay"
          value={
            analytics.medianDaysToRepeat > 0
              ? `${Math.round(analytics.medianDaysToRepeat)} days`
              : "—"
          }
          help="Median days between first and second scrobble, for tracks that were replayed."
        />
        <Metric
          label="Never replayed"
          value={formatPercent(analytics.neverReplayedShare)}
          help="Tracks scrobbled once and never again."
        />
      </div>
      <MiniLabel
        label="Survival curve"
        help="After N days since first play, share of tracks still without a replay."
      />
      {analytics.curve.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="grid gap-2">
          {analytics.curve.map((point) => (
            <div
              key={point.day}
              className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs"
            >
              <span className="font-mono text-muted-foreground">{point.day}d</span>
              <div className="h-2 overflow-hidden rounded-md bg-chart-track">
                <div
                  className="h-full rounded-md bg-chart-2"
                  style={{
                    width: `${Math.max(2, point.survival * 100)}%`,
                    opacity: chartValueOpacity(point.survival / maxSurvival),
                  }}
                />
              </div>
              <span className="text-right font-mono text-muted-foreground">
                {formatPercent(point.survival)}
              </span>
            </div>
          ))}
        </div>
      )}
    </AnalyticsPanel>
  );
}

export function CohortRetentionPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["cohortRetention"];
}) {
  return (
    <AnalyticsPanel
      title="Artist retention"
      description="Artists grouped by discovery month. Shows how many you were still playing 30, 90, and 180 days later."
    >
      <Metric
        label="90-day retention"
        value={formatPercent(analytics.averageRetention90Days)}
        help="Average share of discovered artists still played 90 days later."
      />
      <RankedRows
        label="By discovery month"
        help="Share of that month's new artists still played after 90 days."
        rows={analytics.cohorts.map((cohort) => ({
          title: cohort.label,
          detail: `${formatCompact(cohort.size)} new artists`,
          value: formatPercent(cohort.curve.find((point) => point.day === 90)?.retention ?? 0),
        }))}
      />
    </AnalyticsPanel>
  );
}

export function InterArrivalPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["interArrival"];
}) {
  return (
    <AnalyticsPanel
      title="Same-session replays"
      description="Tracks you play more than once in the same listening session. Counts repeats within a sitting, not time between plays."
    >
      <Metric
        label="Same-session replay share"
        value={formatPercent(analytics.averageSessionReplayShare)}
        help="Among ranked tracks, average share of plays that were repeats within the same session."
      />
      <RankedRows
        label="Most repeated in one sitting"
        help="Sorted by most plays in a single session, then by how many sessions had 2+ plays."
        rows={analytics.tracks.slice(0, 6).map((track) => ({
          title: track.label,
          detail: `${track.detail} · ${formatCompact(track.plays)} plays`,
          value: `${track.maxInSession}× max · ${formatCompact(track.multiSessionCount)} sessions`,
        }))}
      />
    </AnalyticsPanel>
  );
}

export function AlbumDecayPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["albumDecay"];
}) {
  return (
    <AnalyticsPanel
      title="Album play decline"
      description="How quickly album plays drop after the peak week."
    >
      <Metric
        label="Average half-life"
        value={
          analytics.averageHalfLifeDays > 0
            ? `${oneDecimalFormatter.format(analytics.averageHalfLifeDays)} days`
            : "—"
        }
        help="Days after peak week until plays are about half the peak rate."
      />
      <RankedRows
        label="By album"
        help="Half-life per album. Lower = faster drop-off."
        rows={analytics.albums.map((album) => ({
          title: album.label,
          detail: album.detail,
          value: `${Math.round(album.halfLifeDays)} days`,
        }))}
      />
    </AnalyticsPanel>
  );
}
