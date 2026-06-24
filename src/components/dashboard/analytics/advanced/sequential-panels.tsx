import { GitBranchIcon } from "lucide-react";

import type { AdvancedListeningAnalytics } from "@/lib/advanced-listening-analytics";
import { formatCompact, formatPercent } from "@/utils/format";
import { Button } from "@/components/ui/button";

import { useMarkovGraph } from "../../markov-graph-context";
import { decimalFormatter } from "../formatters";
import { Metric } from "../metric";
import { AnalyticsPanel } from "../analytics-panel";
import { BarRow, formatModeLabel, formatModeHelp, RankedRows } from "./shared";

export function MarkovChainPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["markov"];
}) {
  const { openMarkovGraph } = useMarkovGraph();

  return (
    <AnalyticsPanel
      title="Artist switches"
      description="When you change artists during the same session, where you go next. Only includes switches that happen repeatedly."
    >
      <Button
        className="w-full"
        size="sm"
        type="button"
        variant="outline"
        onClick={openMarkovGraph}
      >
        <GitBranchIcon />
        Open switch map
      </Button>
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Switches to settle"
          value={formatCompact(analytics.mixingSteps)}
          help="How many artist changes it takes before the session looks like your usual mix."
        />
        <Metric
          label="Order vs rankings"
          value={decimalFormatter.format(analytics.stationaryDivergence)}
          help="How much play order differs from your overall artist rankings."
        />
      </div>
      <RankedRows
        label="Hub artists"
        help="Artists you often switch to or from."
        rows={analytics.hubArtists.map((artist) => ({
          title: artist.label,
          value: `${formatPercent(artist.hubScore)} of switches`,
        }))}
      />
      <RankedRows
        label="Top switches"
        help="Artist pairs with at least 3 switches in a session. Percent = when you left the first artist, how often you picked the second."
        rows={analytics.topTransitions.map((transition) => ({
          title: `${transition.from} → ${transition.to}`,
          value: `${formatCompact(transition.count)}× · ${formatPercent(transition.probability)}`,
        }))}
      />
    </AnalyticsPanel>
  );
}

export function ListeningModesPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["listeningModes"];
}) {
  const maxShare = Math.max(0, ...analytics.modes.map((mode) => mode.share));

  return (
    <AnalyticsPanel
      title="Session types"
      description="Each session is classified as new music, one-artist focus, replays, or mixed. Shows how often each type appears."
    >
      <Metric
        label="Most common type"
        value={formatModeLabel(analytics.dominantMode)}
        help={formatModeHelp(analytics.dominantMode)}
      />
      <div className="grid gap-2">
        {analytics.modes.map((mode) => (
          <BarRow
            key={mode.mode}
            label={formatModeLabel(mode.mode)}
            value={mode.share}
            max={maxShare}
          />
        ))}
      </div>
      <RankedRows
        label="Session type transitions"
        help="When one session ends and the next starts, how often the type stays the same."
        rows={analytics.topTransitions.map((transition) => ({
          title: `${formatModeLabel(transition.from)} → ${formatModeLabel(transition.to)}`,
          value: formatPercent(transition.probability),
        }))}
      />
    </AnalyticsPanel>
  );
}

export function HawkesPanel({ analytics }: { analytics: AdvancedListeningAnalytics["hawkes"] }) {
  return (
    <AnalyticsPanel
      title="Plays within 30 minutes"
      description="How often one scrobble is followed by another within 30 minutes, and which artists show up most in those runs."
    >
      <Metric
        label="Avg follow-ups"
        value={`${decimalFormatter.format(analytics.globalAvgFollowUps)} plays`}
        help="Average number of plays in the next 30 minutes after any scrobble, within the same session."
      />
      <RankedRows
        label="Top artists"
        help="Artists whose plays are followed by more plays than average in the next 30 minutes."
        rows={analytics.contagiousArtists.map((artist) => ({
          title: artist.label,
          detail: `${formatCompact(artist.plays)} plays · ${decimalFormatter.format(artist.avgFollowUps)} follow-ups each`,
          value: `${decimalFormatter.format(artist.lift)}× avg`,
        }))}
      />
    </AnalyticsPanel>
  );
}

export function SequentialPatternsPanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["sequentialPatterns"];
}) {
  return (
    <AnalyticsPanel
      title="Artist chains"
      description="Repeated artist switch paths within a session. Same-artist streaks are collapsed — only actual switches count."
    >
      <RankedRows
        label="Two artists"
        help="Artist switch pairs (A → B, A ≠ B), at least 3 times in sessions."
        rows={analytics.topBigrams.map((pattern) => ({
          title: pattern.pattern.join(" → "),
          value: `${decimalFormatter.format(pattern.lift)}× vs random`,
          detail: `${formatCompact(pattern.occurrences)} times`,
        }))}
      />
      <RankedRows
        label="Three artists"
        help="Three-step switch paths (A → B → C), at least 3 times. Can include returning to an earlier artist."
        rows={analytics.topTrigrams.map((pattern) => ({
          title: pattern.pattern.join(" → "),
          value: `${decimalFormatter.format(pattern.lift)}× vs random`,
          detail: `${formatCompact(pattern.occurrences)} times`,
        }))}
      />
    </AnalyticsPanel>
  );
}
