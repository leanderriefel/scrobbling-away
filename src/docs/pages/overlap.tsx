import {
  DocLead,
  DocSection,
  FileRef,
  Formula,
  MetricTable,
  ThresholdTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function OverlapPage() {
  return (
    <>
      <DocsPageHeader
        title="Current vs historical"
        description="How your recent listening overlaps with your all-time top lists."
      />
      <div className="grid gap-14">
        <DocLead>
          This panel compares two windows: the last 30 days of scrobbles vs your full synced
          history. Top lists are built independently for each window.
        </DocLead>

        <DocSection title="Windows & list size">
          <ThresholdTable
            rows={[
              { name: "CURRENT_WINDOW_DAYS", value: "30", usedIn: "Recent window length" },
              { name: "Top list size", value: "50", usedIn: "Artists, albums, tracks ranked" },
              {
                name: "Mini list display",
                value: "5",
                usedIn: "recentOnly / historicalOnly shown",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Jaccard similarity">
          <Formula>{`Jaccard = |recentTop ∩ historicalTop| / |recentTop ∪ historicalTop|`}</Formula>
          <p>
            Computed separately for artists, albums, and tracks. The dashboard headline focuses on
            artists.
          </p>
        </DocSection>

        <DocSection title="Metrics">
          <MetricTable
            rows={[
              {
                metric: "Artist overlap",
                meaning: "Count of artists in both top-50 lists.",
                formula: "|intersection|",
              },
              {
                metric: "Jaccard",
                meaning: "Overlap relative to combined unique entries.",
                formula: "intersection / union",
              },
              {
                metric: "Recent from all-time",
                meaning: "Share of recent scrobbles by artists in historical top-50.",
                formula: "recent plays by historical-top artists / all recent plays",
              },
              {
                metric: "Window",
                meaning: "Length of the recent period.",
                formula: "30 days",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Recent-only & historical-only lists">
          <p>
            <strong>Recent-only</strong> — top recent artists not in historical top-50 (new
            favorites or rediscoveries).
          </p>
          <p>
            <strong>Historical-only</strong> — all-time favorites absent from recent top-50 (dormant
            tastes).
          </p>
        </DocSection>

        <DocSection title="Source">
          <p>
            <FileRef path="src/lib/listening-analytics.ts" /> —{" "}
            <code className="font-mono text-xs">deriveOverlap()</code>
          </p>
          <p>
            UI: <FileRef path="src/components/dashboard/analytics/current-overlap.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
