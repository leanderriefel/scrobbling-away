import {
  Callout,
  DocLead,
  DocSection,
  FileRef,
  Formula,
  MetricTable,
  ThresholdTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function DiscoveryReplayPage() {
  return (
    <>
      <DocsPageHeader
        title="Discovery vs replay"
        description="How scrobbles are classified as first-time, repeat, or heavy repeat plays."
      />
      <div className="grid gap-14">
        <DocLead>
          Each scrobble is categorized by how many times you have previously scrobbled the same
          artist+track pair, in chronological order.
        </DocLead>

        <DocSection title="Classification rules">
          <MetricTable
            rows={[
              {
                metric: "New",
                meaning: "First scrobble of this artist+track pair.",
                formula: "seenCount === 0 before this play",
              },
              {
                metric: "Repeat",
                meaning: "2nd through 9th scrobble of the pair.",
                formula: "1 ≤ seenCount < 9",
              },
              {
                metric: "Heavy",
                meaning: "10th or later scrobble of the pair.",
                formula: "seenCount ≥ 9",
              },
            ]}
          />
          <ThresholdTable
            rows={[
              {
                name: "Heavy repeat threshold",
                value: "10th play",
                usedIn: "seenCount >= 9 before current play",
              },
            ]}
          />
          <Callout variant="assumption">
            Classification is based on <strong>artist + track</strong> pairs, not track title alone.
            Album or duration metadata is ignored.
          </Callout>
        </DocSection>

        <DocSection title="Discovery rate">
          <Formula>discoveryRate = newPlays / totalPlays</Formula>
          <p>
            The stacked monthly bar chart shows the mix of new / repeat / heavy per month. Bar
            opacity scales with total volume for that month.
          </p>
        </DocSection>

        <DocSection title="Monthly breakdown">
          <p>
            Scrobbles are bucketed by calendar month (from{" "}
            <FileRef path="src/utils/account-timeline.ts" />
            ). Each month stores counts for new, repeat, heavy, and total.
          </p>
        </DocSection>

        <DocSection title="Source">
          <p>
            <FileRef path="src/lib/listening-analytics.ts" /> —{" "}
            <code className="font-mono text-xs">deriveDiscoveryReplay()</code>
          </p>
          <p>
            UI: <FileRef path="src/components/dashboard/analytics/discovery-replay.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
