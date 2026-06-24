import {
  AlgorithmSteps,
  Callout,
  DocLead,
  DocSection,
  FileRef,
  Formula,
  MetricTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function ComparePage() {
  return (
    <>
      <DocsPageHeader
        title="Compare mode"
        description="Side-by-side listener comparison and advanced pairwise similarity metrics."
      />
      <div className="grid gap-14">
        <DocLead>
          Compare mode loads up to 4 Last.fm users. Basic compare shows rankings, rhythm, and shared
          artist overlap. Advanced compare computes pairwise taste distance, session structure
          similarity, and discovery timing coupling.
        </DocLead>

        <DocSection title="Basic compare (dashboard)">
          <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>
              <strong>Column headers</strong> — listening signature peaks per user
            </li>
            <li>
              <strong>Listening rhythm</strong> — per-column year summary
            </li>
            <li>
              <strong>Rankings</strong> — period top lists per column
            </li>
            <li>
              <strong>Shared artist overlap</strong> — artists in common across compared users
            </li>
          </ul>
          <p>
            UI: <FileRef path="src/components/dashboard/compare-dashboard.tsx" />,{" "}
            <FileRef path="src/components/dashboard/shared-artist-overlap.tsx" />
          </p>
        </DocSection>

        <DocSection title="Advanced compare metrics">
          <p>
            <FileRef path="src/lib/compare-advanced-analytics.ts" /> — computed at render for all
            user pairs.
          </p>

          <MetricTable
            rows={[
              {
                metric: "Taste distance",
                meaning: "How different two users' artist mixes are. Lower = more alike.",
                formula: "1D Wasserstein on aligned artist distributions",
              },
              {
                metric: "Session overlap",
                meaning: "Similarity of session co-occurrence structure.",
                formula: "Jaccard(topPmiPairs left, topPmiPairs right)",
              },
              {
                metric: "Discovery coupling",
                meaning: "Whether new-music weeks align between users.",
                formula: "Pearson(weekly new-track counts)",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Taste distance algorithm">
          <AlgorithmSteps
            steps={[
              "Build normalized artist play distribution per user from recent scrobbles.",
              "Union all artist keys; align into vectors.",
              "Sort each user's values ascending.",
              "Wasserstein ≈ mean absolute difference of sorted values / key count.",
            ]}
          />
          <Formula>W = (1/K) Σ |sort(P)ᵢ − sort(Q)ᵢ</Formula>
        </DocSection>

        <DocSection title="Graph similarity">
          <p>
            Each user's <code className="font-mono text-xs">advanced.graph.topPmiPairs</code> is
            keyed as <code className="font-mono text-xs">artist::neighbor</code>. Jaccard index on
            the two sets.
          </p>
        </DocSection>

        <DocSection title="Discovery coupling">
          <p>
            Weekly new-track counts are aligned by calendar week. Pearson correlation across
            overlapping weeks. 1 = perfectly in sync, 0 = uncorrelated.
          </p>
        </DocSection>

        <Callout variant="assumption">
          Compare uses each user's <strong>synced scrobble cache</strong>. Users with different sync
          depths or date ranges may show misleading coupling.
        </Callout>

        <DocSection title="Source">
          <p>
            UI: <FileRef path="src/components/dashboard/analytics/advanced/compare-panels.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
