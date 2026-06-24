import {
  AlgorithmSteps,
  Callout,
  DocLead,
  DocSection,
  FileRef,
  Formula,
  MetricTable,
  ThresholdTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function GraphStructurePage() {
  return (
    <>
      <DocsPageHeader
        title="Session co-occurrence"
        description="Which artists appear together in sessions — distinct from the artist switch map."
      />
      <div className="grid gap-14">
        <DocLead>
          The &quot;Artists in the same session&quot; panel builds an undirected co-occurrence
          graph. The Markov switch map tracks <em>order</em> of transitions; this graph tracks{" "}
          <em>presence</em> in the same sitting.
        </DocLead>

        <DocSection title="Graph construction">
          <p>
            <code className="font-mono text-xs">deriveGraphStructure()</code> in{" "}
            <FileRef path="src/lib/advanced-listening-analytics.ts" />
          </p>
          <AlgorithmSteps
            steps={[
              "For each session, collect unique artists present.",
              "Increment co-occurrence count for every artist pair in that session.",
              "Compute PMI: log₂(observed / expected) for top pairs.",
              "Build communities via BFS on edges with weight ≥ 2, min 2 members.",
              "Identify bridge artists: neighborCount × log₂(strength + 1).",
            ]}
          />
        </DocSection>

        <DocSection title="PMI (pointwise mutual information)">
          <Formula>PMI(A, B) = log₂( P(A,B) / (P(A) × P(B)) )</Formula>
          <p>
            High PMI means two artists appear together more often than independence would predict.
          </p>
        </DocSection>

        <DocSection title="Metrics">
          <MetricTable
            rows={[
              {
                metric: "Group separation",
                meaning: "How clearly listening splits into separate artist groups.",
                formula: "clamp01(avg community playShare) — simplified modularity",
              },
              {
                metric: "Bridge artists",
                meaning: "Artists connecting otherwise separate groups.",
                formula: "neighborCount × log₂(strength + 1), top 5",
              },
              {
                metric: "Session groups",
                meaning: "Artist clusters co-occurring in sessions.",
                formula: "BFS communities, top 4 by playShare",
              },
              {
                metric: "Strong pairs",
                meaning: "Highest PMI co-occurrence pairs.",
                formula: "top 6 PMI pairs",
              },
            ]}
          />
          <ThresholdTable
            rows={[
              { name: "Min co-occur edge", value: "2", usedIn: "Community BFS" },
              { name: "Min community size", value: "2 artists", usedIn: "Community BFS" },
            ]}
          />
        </DocSection>

        <Callout variant="note">
          Compare mode uses <code className="font-mono text-xs">topPmiPairs</code> keys for session
          overlap similarity (Jaccard on pair strings).
        </Callout>

        <DocSection title="Source">
          <p>
            UI: <FileRef path="src/components/dashboard/analytics/advanced/graph-panels.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
