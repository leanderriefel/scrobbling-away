import {
  AlgorithmSteps,
  Callout,
  DocLead,
  DocSection,
  FileRef,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function DataPipelinePage() {
  return (
    <>
      <DocsPageHeader
        title="Data pipeline"
        description="How Last.fm scrobbles become the stats you see on the dashboard."
      />
      <div className="grid gap-14">
        <DocLead>
          Data flows from Last.fm → IndexedDB → derived stats snapshot → React components. Heavy
          computation runs in Web Workers so the UI stays responsive.
        </DocLead>

        <DocSection title="Sync & storage">
          <AlgorithmSteps
            steps={[
              "Last.fm API is called from the browser to fetch recent tracks and period top lists.",
              "Results are stored in Dexie (IndexedDB) via lastfm-stats-cache.",
              "Profile metadata (username, registration date) is cached alongside scrobbles.",
            ]}
          />
          <p>
            Source: <FileRef path="src/lib/lastfm-stats-sync.ts" />,{" "}
            <FileRef path="src/lib/lastfm-stats-cache.ts" />.
          </p>
        </DocSection>

        <DocSection title="Derived stats (worker)">
          <p>
            <FileRef path="src/lib/lastfm-derived-stats.ts" /> orchestrates derivation. The async
            entry point <code className="font-mono text-xs">deriveLastFmStatsAsync()</code> offloads
            work to <FileRef path="src/lib/lastfm-derived-stats.worker.ts" />.
          </p>
          <AlgorithmSteps
            steps={[
              "Build scrobbles-by-year/month/day histograms.",
              "Compute item-level stats (per artist/album/track).",
              "Call deriveListeningAnalytics(recentTracks, periodLists).",
              "Attach result to snapshot.derived.analytics.",
            ]}
          />
        </DocSection>

        <DocSection title="Listening analytics">
          <p>
            <FileRef path="src/lib/listening-analytics.ts" /> produces{" "}
            <code className="font-mono text-xs">SeriousListeningAnalytics</code>:
          </p>
          <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>concentration</li>
            <li>discoveryReplay</li>
            <li>libraryGrowth</li>
            <li>rankMovement</li>
            <li>sessions</li>
            <li>overlap</li>
            <li>advanced (nested object)</li>
          </ul>
          <p>
            Advanced analytics are delegated to{" "}
            <FileRef path="src/lib/advanced-listening-analytics.ts" /> with an optional{" "}
            <code className="font-mono text-xs">timelineStart</code> from account registration or
            first scrobble (<FileRef path="src/utils/account-timeline.ts" />
            ).
          </p>
        </DocSection>

        <DocSection title="React consumption">
          <p>
            <FileRef path="src/components/dashboard/dashboard-context.tsx" /> exposes{" "}
            <code className="font-mono text-xs">useDashboardSnapshot()</code>. Panel components read{" "}
            <code className="font-mono text-xs">snapshot.derived.analytics</code> and render
            charts/metrics.
          </p>
          <Callout variant="assumption">
            All analytics recompute when the snapshot updates after sync. There is no incremental
            update — a full re-derivation runs on the cached scrobble set.
          </Callout>
        </DocSection>

        <DocSection title="Compare mode">
          <p>
            Compare loads multiple snapshots (up to 4 users). Pairwise advanced compare metrics are
            computed at render time by <FileRef path="src/lib/compare-advanced-analytics.ts" /> —
            they are not pre-cached in the snapshot.
          </p>
        </DocSection>

        <DocSection title="Markov graph (on demand)">
          <p>
            The artist switch map is <em>not</em> pre-computed in the snapshot summary. Opening the
            overlay rebuilds the full graph from IndexedDB scrobbles via{" "}
            <FileRef path="src/lib/markov-graph.ts" />, then runs vibe detection and force layout in
            a worker (<FileRef path="src/lib/markov-force-layout.worker.ts" />
            ).
          </p>
        </DocSection>
      </div>
    </>
  );
}
