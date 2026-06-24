import {
  Callout,
  DocLead,
  DocSection,
  FileRef,
  Formula,
  MetricTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function ConcentrationPage() {
  return (
    <>
      <DocsPageHeader
        title="Listening concentration"
        description="How much of your listening is dominated by a small set of artists."
      />
      <div className="grid gap-14">
        <DocLead>
          Concentration measures inequality in your artist play distribution — similar to wealth
          inequality metrics in economics.
        </DocLead>

        <DocSection title="Top-N artist shares">
          <p>Artists are ranked by play count. For N ∈ {"{5, 10, 25, 50}"}:</p>
          <Formula>topNShare = (plays by top N artists) / (total plays)</Formula>
          <p>The bar chart in the dashboard shows all four limits. Hover for exact percentages.</p>
        </DocSection>

        <DocSection title="Artists to 50% / 80%">
          <p>
            Walk down the ranked artist list, accumulating play share until the threshold is
            reached. The count of artists needed is reported.
          </p>
          <Callout variant="assumption">
            Ties in play count follow the sort order from the ranking builder — artists with equal
            counts may appear in arbitrary relative order.
          </Callout>
        </DocSection>

        <DocSection title="Gini coefficient">
          <p>Artist play counts are sorted ascending. The Gini formula used:</p>
          <Formula>
            {`G = (2 × Σ(i × count_i)) / (n × total) − (n + 1) / n

where i is 1-based rank in ascending sort, n = number of artists, total = sum of counts`}
          </Formula>
          <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>0 = perfectly equal plays across all artists</li>
            <li>1 = one artist has all plays</li>
          </ul>
        </DocSection>

        <DocSection title="Artist share curve (Lorenz-style)">
          <p>
            <code className="font-mono text-xs">artistCurve</code> stores cumulative share at each
            artist rank index — used internally; the UI shows the top-N bars and threshold blocks
            instead.
          </p>
        </DocSection>

        <DocSection title="Dashboard metrics">
          <MetricTable
            rows={[
              {
                metric: "Top 10 share",
                meaning: "Share of scrobbles from your 10 most-played artists.",
                formula: "top10 plays / total",
              },
              {
                metric: "Artists to 50%",
                meaning: "Fewest artists covering half your plays.",
                formula: "cumulative rank threshold",
              },
              {
                metric: "Artists to 80%",
                meaning: "Fewest artists covering 80% of plays.",
                formula: "cumulative rank threshold",
              },
              {
                metric: "Gini",
                meaning: "Overall concentration score 0–1.",
                formula: "see formula above",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Source">
          <p>
            <FileRef path="src/lib/listening-analytics.ts" /> —{" "}
            <code className="font-mono text-xs">deriveConcentration()</code>
          </p>
          <p>
            UI: <FileRef path="src/components/dashboard/analytics/listening-concentration.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
