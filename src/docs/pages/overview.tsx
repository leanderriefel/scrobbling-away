import {
  AlgorithmSteps,
  Callout,
  DocLead,
  DocSection,
  FileRef,
  RepoLink,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function OverviewPage() {
  return (
    <>
      <DocsPageHeader
        title="Overview"
        description="Scrobbling Away turns your Last.fm scrobble history into listening analytics. This page explains what the numbers mean at a high level and the assumptions baked into every calculation."
      />
      <div className="grid gap-14">
        <DocLead>
          The app runs entirely in your browser. Last.fm data is synced into IndexedDB (Dexie), then
          derived into stats on demand. Nothing is sent to a custom backend for analytics — the
          server only serves the app (or static assets from a CDN). <RepoLink />.
        </DocLead>

        <DocSection title="What data is analyzed">
          <p>
            Almost every stat is computed from <strong>cached recent scrobbles</strong> stored
            locally after sync — not from Last.fm&apos;s full lifetime playcount API unless a panel
            explicitly uses period rankings (e.g. compare columns).
          </p>
          <Callout variant="assumption">
            Analytics reflect your synced scrobble window. If you have not synced recently, stats
            only cover what is in cache. Rankings from Last.fm period lists (7-day, 1-month, etc.)
            are separate and used only where noted.
          </Callout>
        </DocSection>

        <DocSection title="Entity identity">
          <p>
            Artists, albums, and tracks are keyed by trimmed, lowercased strings via{" "}
            <FileRef path="src/utils/track-keys.ts" />. Two scrobbles with different capitalization
            or trailing spaces are treated as the same entity.
          </p>
          <p>
            Discovery vs replay uses an <strong>artist + track</strong> pair — not track title
            alone. The same song by different artists counts separately.
          </p>
        </DocSection>

        <DocSection title="Chronological ordering">
          <AlgorithmSteps
            steps={[
              "Sort all scrobbles by playedAtTimestamp ascending.",
              "Tie-break equal timestamps by scrobble id (lexicographic).",
              "Most session-based and sequential metrics operate on this ordered list.",
            ]}
          />
        </DocSection>

        <DocSection title="Analytics layers">
          <p>The pipeline has three layers:</p>
          <ol className="grid gap-2 pl-5 [list-style-type:decimal] marker:text-muted-foreground">
            <li>
              <strong>Core analytics</strong> — concentration, discovery/replay, library growth,
              sessions, overlap. See <FileRef path="src/lib/listening-analytics.ts" />.
            </li>
            <li>
              <strong>Advanced analytics</strong> — 21 modules (Markov, entropy, survival, etc.).
              See <FileRef path="src/lib/advanced-listening-analytics.ts" />.
            </li>
            <li>
              <strong>Compare analytics</strong> — pairwise metrics across up to 4 users. See{" "}
              <FileRef path="src/lib/compare-advanced-analytics.ts" />.
            </li>
          </ol>
        </DocSection>

        <DocSection title="Sessions are foundational">
          <p>
            Many advanced metrics depend on how scrobbles are split into listening sessions. The gap
            between sessions is <em>adaptive</em> — tuned from your pause patterns, not a fixed
            30-minute rule. See the <a href="/docs/listening-sessions">Listening sessions</a> page
            for the full algorithm.
          </p>
        </DocSection>

        <DocSection title="Dashboard sections">
          <p>
            The main dashboard (<FileRef path="src/components/dashboard/stats-workspace.tsx" />)
            has:
          </p>
          <ul className="grid gap-1.5 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>Rankings and play history from Last.fm period lists</li>
            <li>Listening rhythm — clock, weekday, month, year charts</li>
            <li>Core analytics — concentration, discovery, library, sessions, overlap</li>
            <li>Advanced analytics — 21 panels in a two-column layout</li>
            <li>Compare mode — side-by-side columns for up to 4 listeners</li>
          </ul>
          <Callout variant="note">
            Rank movement is computed in <FileRef path="src/lib/listening-analytics.ts" /> but not
            yet shown in the UI. It compares Last.fm period rankings to overall rankings.
          </Callout>
        </DocSection>
      </div>
    </>
  );
}
