import type { AdvancedListeningAnalytics } from "@/lib/advanced-listening-analytics";
import { formatPercent } from "@/utils/format";

import { decimalFormatter } from "../formatters";
import { Metric } from "../metric";
import { AnalyticsPanel } from "../analytics-panel";
import { BarRow, RankedRows } from "./shared";

export function EntropyPanel({ analytics }: { analytics: AdvancedListeningAnalytics["entropy"] }) {
  const maxEntropy = Math.max(
    0,
    ...analytics.dailyVolumeEntropy.map((entry) => entry.entropy),
    ...analytics.dailyDiversityEntropy.map((entry) => entry.entropy),
  );

  return (
    <AnalyticsPanel
      title="Artist variety"
      description="How spread out your artist listening is, and how predictable your daily play counts are at different time scales."
    >
      <Metric
        label="Artist spread"
        value={decimalFormatter.format(analytics.artistEntropy)}
        help="How many different artists you listen to. Higher = more variety."
      />
      <RankedRows
        label="Play count variation"
        help="How unpredictable your play counts are per day, week, or month."
        rows={analytics.dailyVolumeEntropy.map((entry) => ({
          title: entry.scale === 1 ? "Daily" : entry.scale === 7 ? "Weekly" : "Monthly",
          value: decimalFormatter.format(entry.entropy),
        }))}
      />
      <RankedRows
        label="Artist count variation"
        help="How much the number of artists per day varies."
        rows={analytics.dailyDiversityEntropy.map((entry) => ({
          title: entry.scale === 1 ? "Daily" : entry.scale === 7 ? "Weekly" : "Monthly",
          value: decimalFormatter.format(entry.entropy),
        }))}
      />
      <div className="grid gap-2">
        {analytics.dailyDiversityEntropy.map((entry) => (
          <BarRow
            key={`diversity-${entry.scale}`}
            label={entry.scale === 1 ? "Daily" : entry.scale === 7 ? "Weekly" : "Monthly"}
            value={entry.entropy / Math.max(maxEntropy, 1e-6)}
            max={1}
          />
        ))}
      </div>
    </AnalyticsPanel>
  );
}

export function TransferEntropyPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["transferEntropy"];
}) {
  const flowLabel =
    analytics.dominantFlow === "discovery→replay"
      ? "New-heavy weeks → more replays next week"
      : analytics.dominantFlow === "replay→discovery"
        ? "Replay-heavy weeks → more new music next week"
        : "No clear weekly pattern";

  const formatCorrelation = (value: number) => {
    const formatted = decimalFormatter.format(Math.abs(value));

    if (Math.abs(value) < 0.05) return "~0";

    return `${value > 0 ? "+" : "-"}${formatted}`;
  };

  return (
    <AnalyticsPanel
      title="New music vs replays"
      description="Weekly correlation: does a heavy new-music week predict next week's replay share, or the other way around?"
    >
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="New week → next replay share"
          value={formatCorrelation(analytics.discoveryToReplay)}
          help="Correlation between this week's new-track share and next week's replay share. Positive = new music now, more replays later."
        />
        <Metric
          label="Replay week → next new share"
          value={formatCorrelation(analytics.replayToDiscovery)}
          help="Correlation between this week's replay share and next week's new-track share. Positive = replays now, more new music later."
        />
      </div>
      <Metric
        label="Pattern"
        value={flowLabel}
        help="Which lagged correlation is stronger in your history."
      />
    </AnalyticsPanel>
  );
}

export function TasteDriftPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["tasteDrift"];
}) {
  const peakDistance = Math.max(analytics.peakDistance, 1e-6);

  return (
    <AnalyticsPanel
      title="Monthly taste change"
      description="Share of monthly plays that moved to different artists vs the prior month."
    >
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Average change"
          value={formatPercent(analytics.averageMonthlyDistance)}
          help="Typical month-over-month shift in your artist mix."
        />
        <Metric
          label="Largest change"
          value={formatPercent(analytics.peakDistance)}
          help="Biggest single month-over-month shift."
        />
      </div>
      <RankedRows
        label="Recent months"
        help="Artist mix change vs the previous month."
        rows={analytics.months.slice(-6).map((month) => ({
          title: month.label,
          value: formatPercent(month.distance),
        }))}
      />
      <div className="grid gap-2">
        {analytics.months.slice(-8).map((month) => (
          <BarRow key={month.label} label={month.label} value={month.distance} max={peakDistance} />
        ))}
      </div>
    </AnalyticsPanel>
  );
}

export function CounterfactualPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["counterfactual"];
}) {
  return (
    <AnalyticsPanel
      title="Play order effect"
      description="How much your sessions bunch same-artist plays together vs a scrambled play order."
    >
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="Actual streakiness"
          value={decimalFormatter.format(analytics.actualGini)}
          help="How clustered same-artist plays are within sessions. 0 = evenly mixed, 1 = long same-artist runs."
        />
        <Metric
          label="Scrambled streakiness"
          value={decimalFormatter.format(analytics.shuffledGini)}
          help="Same score if each session's artist order were spread out as much as possible."
        />
        <Metric
          label="Order boost"
          value={decimalFormatter.format(analytics.orderEffect)}
          help="Actual minus scrambled. Positive = your play order creates more same-artist streaks than the mix alone."
        />
      </div>
    </AnalyticsPanel>
  );
}

export function ErgodicityPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["ergodicity"];
}) {
  return (
    <AnalyticsPanel
      title="Lifetime vs monthly top artist"
      description="Compares your all-time #1 artist share to a typical month's #1 artist share."
    >
      <Metric
        label="Difference"
        value={formatPercent(analytics.divergence)}
        help="Gap between lifetime and typical monthly top-artist share."
      />
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="All-time #1 share"
          value={formatPercent(analytics.timeAverageTopArtistShare)}
          help="Share of all scrobbles that belong to your most-played artist."
        />
        <Metric
          label="Typical month #1 share"
          value={formatPercent(analytics.sliceAverageTopArtistShare)}
          help="Share of plays going to that month's top artist, averaged across months."
        />
      </div>
    </AnalyticsPanel>
  );
}
