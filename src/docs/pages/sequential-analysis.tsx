import {
  AlgorithmSteps,
  Callout,
  DocLead,
  DocSection,
  FileRef,
  MetricTable,
  ThresholdTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function SequentialAnalysisPage() {
  return (
    <>
      <DocsPageHeader
        title="Sequential patterns"
        description="Hawkes-style contagion within sessions and repeated artist switch chains."
      />
      <div className="grid gap-14">
        <DocLead>
          These metrics look at <em>order</em> within sessions: what follows a play, and which
          multi-artist paths repeat.
        </DocLead>

        <DocSection title="Plays within 30 minutes (Hawkes)">
          <p>
            <FileRef path="src/lib/advanced-listening-analytics.ts" /> —{" "}
            <code className="font-mono text-xs">deriveHawkes()</code>
          </p>
          <AlgorithmSteps
            steps={[
              "For each scrobble in each session, count subsequent scrobbles within 30 minutes.",
              "Compute global average follow-ups per play.",
              "Per artist: average follow-ups and lift = artistAvg / globalAvg.",
              "Filter artists with ≥ 8 plays; report top 5 by lift.",
            ]}
          />
          <MetricTable
            rows={[
              {
                metric: "Avg follow-ups",
                meaning: "Mean plays in next 30 min after any scrobble (same session).",
                formula: "mean(followUpCount)",
              },
              {
                metric: "Artist lift",
                meaning: "How much more (or less) follow-ups this artist triggers.",
                formula: "artistAvgFollowUps / globalAvgFollowUps",
              },
            ]}
          />
          <ThresholdTable
            rows={[
              { name: "HAWKES_WINDOW_SECONDS", value: "1800 (30 min)", usedIn: "Follow-up window" },
              { name: "Min artist plays", value: "8", usedIn: "Include in ranking" },
            ]}
          />
          <Callout variant="assumption">
            This is a simplified contagion measure, not a full Hawkes process MLE. It counts raw
            follow-ups rather than modeling background intensity.
          </Callout>
        </DocSection>

        <DocSection title="Artist chains (sequential patterns)">
          <p>
            <code className="font-mono text-xs">deriveSequentialPatterns()</code>
          </p>
          <AlgorithmSteps
            steps={[
              "Collapse consecutive same-artist plays (streaks become one symbol).",
              "Mine bigrams (A → B) and trigrams (A → B → C) on collapsed sequence.",
              "Exclude patterns where all artists are identical.",
              "Keep patterns with count ≥ 3.",
              "Compute support, confidence, lift; sort by lift then count; top 5 each.",
            ]}
          />
          <MetricTable
            rows={[
              {
                metric: "Support",
                meaning: "How often the pattern appears.",
                formula: "occurrences / total patterns",
              },
              {
                metric: "Confidence",
                meaning: "Given prefix, how often suffix follows.",
                formula: "P(suffix | prefix)",
              },
              {
                metric: "Lift",
                meaning: "How much more likely vs random independence.",
                formula: "confidence / P(suffix)",
              },
            ]}
          />
          <ThresholdTable
            rows={[{ name: "MIN_PATTERN_COUNT", value: "3", usedIn: "Minimum occurrences" }]}
          />
        </DocSection>

        <DocSection title="Source">
          <p>
            UI: <FileRef path="src/components/dashboard/analytics/advanced/sequential-panels.tsx" />{" "}
            — <code className="font-mono text-xs">HawkesPanel</code>,{" "}
            <code className="font-mono text-xs">SequentialPatternsPanel</code>
          </p>
        </DocSection>
      </div>
    </>
  );
}
