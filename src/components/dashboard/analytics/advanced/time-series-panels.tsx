import type { AdvancedListeningAnalytics } from "@/lib/advanced-listening-analytics";
import { formatPercent } from "@/utils/format";

import { decimalFormatter, oneDecimalFormatter } from "../formatters";
import { Metric } from "../metric";
import { AnalyticsPanel } from "../analytics-panel";
import { BarRow, formatChangeMetric, RankedRows } from "./shared";
import { MiniLabel } from "../mini-label";

export function ChangePointsPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["changePoints"];
}) {
  return (
    <AnalyticsPanel
      title="Habit shifts"
      description="Months where listening volume, new-music rate, or artist concentration changed noticeably."
    >
      <RankedRows
        label="Shift points"
        help="Months with the largest change vs prior months."
        rows={analytics.eras.map((era) => ({
          title: `${era.label}`,
          detail: `${formatChangeMetric(era.metric)}: ${decimalFormatter.format(era.valueBefore)} → ${decimalFormatter.format(era.valueAfter)}`,
          value: formatChangeMetric(era.metric),
        }))}
      />
    </AnalyticsPanel>
  );
}

export function DecompositionPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["decomposition"];
}) {
  const trendLabel =
    analytics.trendDirection === "rising"
      ? "Increasing"
      : analytics.trendDirection === "falling"
        ? "Decreasing"
        : "Flat";

  return (
    <AnalyticsPanel
      title="Daily play breakdown"
      description="Splits daily play counts into long-term trend, weekly pattern, and leftover spikes."
    >
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Weekly pattern"
          value={formatPercent(analytics.weeklySeasonalityStrength)}
          help="How much day-to-day variation follows a repeating weekly cycle."
        />
        <Metric
          label="Trend"
          value={trendLabel}
          help="Whether average daily plays are going up, down, or staying flat."
        />
      </div>
      <RankedRows
        label="Recent residuals"
        help="Days above or below the expected level after removing trend and weekly pattern."
        rows={analytics.points.slice(-4).map((point) => ({
          title: point.label,
          detail: `expected: ${oneDecimalFormatter.format(point.trend)} plays`,
          value: `${point.residual > 0 ? "+" : ""}${oneDecimalFormatter.format(point.residual)}`,
        }))}
      />
    </AnalyticsPanel>
  );
}

export function DfaPanel({ analytics }: { analytics: AdvancedListeningAnalytics["dfa"] }) {
  const interpretation =
    analytics.interpretation === "persistent"
      ? "Clustered"
      : analytics.interpretation === "anti-persistent"
        ? "Alternating"
        : "Random";

  const interpretationHelp =
    analytics.interpretation === "persistent"
      ? "High-volume days tend to follow high-volume days."
      : analytics.interpretation === "anti-persistent"
        ? "High-volume days tend to be followed by low-volume days."
        : "Day volume does not predict the next day.";

  return (
    <AnalyticsPanel
      title="Day-to-day volume"
      description="Whether high play-count days tend to cluster or alternate with low days."
    >
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Hurst exponent"
          value={decimalFormatter.format(analytics.hurstExponent)}
          help="0–1 scale. Above 0.5 = clustered days. Below 0.5 = alternating days. Near 0.5 = no pattern."
        />
        <Metric label="Pattern" value={interpretation} help={interpretationHelp} />
      </div>
    </AnalyticsPanel>
  );
}

export function PacfPanel({ analytics }: { analytics: AdvancedListeningAnalytics["pacf"] }) {
  const maxValue = Math.max(0, ...analytics.lags.map((lag) => Math.abs(lag.value)));

  return (
    <AnalyticsPanel
      title="Daily play autocorrelation"
      description="How much past daily play counts correlate with today's count."
    >
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Predictability"
          value={formatPercent(analytics.predictabilityScore)}
          help="How much daily plays follow repeating patterns."
        />
        <Metric
          label="Strongest lag"
          value={analytics.dominantLag ? `${analytics.dominantLag} days` : "—"}
          help="Lag with the strongest correlation to today's play count."
        />
      </div>
      <MiniLabel
        label="Correlation by lag"
        help="Correlation between today's plays and plays N days ago."
      />
      <div className="grid gap-2">
        {analytics.lags.slice(0, 8).map((lag) => (
          <BarRow
            key={lag.lag}
            label={`${lag.lag}d ago`}
            value={Math.abs(lag.value) / Math.max(maxValue, 1e-6)}
            max={1}
          />
        ))}
      </div>
    </AnalyticsPanel>
  );
}

export function RecurrencePanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["recurrence"];
}) {
  return (
    <AnalyticsPanel
      title="Repeated day profiles"
      description="How often days with similar volume, artist count, and new-music rate show up in your history."
    >
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="Recurrence"
          value={formatPercent(analytics.recurrenceRate)}
          help="How often a day's profile matches another day."
        />
        <Metric
          label="Determinism"
          value={formatPercent(analytics.determinism)}
          help="How often similar days occur back to back."
        />
        <Metric
          label="Laminarity"
          value={formatPercent(analytics.laminarity)}
          help="How long you stay in the same kind of day before shifting."
        />
      </div>
    </AnalyticsPanel>
  );
}
