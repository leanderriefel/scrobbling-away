import {
  DocLead,
  DocSection,
  FileRef,
  RepoLink,
  ThresholdTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function ImplementationPage() {
  return (
    <>
      <DocsPageHeader
        title="Implementation"
        description="Source file map, Web Workers, and a consolidated reference of constants and thresholds."
      />
      <div className="grid gap-14">
        <DocLead>
          All analytics run client-side in TypeScript. Source lives on <RepoLink /> — file links
          below open the matching path on GitHub.
        </DocLead>

        <DocSection title="Core library files">
          <ul className="grid gap-2 text-sm">
            <li>
              <FileRef path="src/lib/listening-sessions.ts" /> — session gap & splitting
            </li>
            <li>
              <FileRef path="src/lib/listening-analytics.ts" /> — core analytics
            </li>
            <li>
              <FileRef path="src/lib/advanced-listening-analytics.ts" /> — 21 advanced modules
            </li>
            <li>
              <FileRef path="src/lib/compare-advanced-analytics.ts" /> — pairwise compare
            </li>
            <li>
              <FileRef path="src/lib/markov-graph.ts" /> — graph build & summary
            </li>
            <li>
              <FileRef path="src/lib/markov-vibe-groups.ts" /> — clustering & colors
            </li>
            <li>
              <FileRef path="src/lib/markov-force-layout.ts" /> — layout simulation
            </li>
            <li>
              <FileRef path="src/lib/markov-force-layout.worker.ts" /> — layout worker
            </li>
            <li>
              <FileRef path="src/lib/markov-graph-render.ts" /> — canvas renderer
            </li>
            <li>
              <FileRef path="src/lib/lastfm-derived-stats.ts" /> — derivation orchestrator
            </li>
            <li>
              <FileRef path="src/lib/lastfm-derived-stats.worker.ts" /> — heavy derivation
            </li>
          </ul>
        </DocSection>

        <DocSection title="Utilities">
          <ul className="grid gap-2 text-sm">
            <li>
              <FileRef path="src/utils/track-keys.ts" /> — entity key normalization
            </li>
            <li>
              <FileRef path="src/utils/account-timeline.ts" /> — month keys & timeline start
            </li>
            <li>
              <FileRef path="src/utils/listening-signature.ts" /> — peak hour/day summaries
            </li>
            <li>
              <FileRef path="src/utils/chart-intensity.ts" /> — bar opacity scaling
            </li>
            <li>
              <FileRef path="src/utils/format.ts" /> — number/percent formatting
            </li>
          </ul>
        </DocSection>

        <DocSection title="UI components">
          <ul className="grid gap-2 text-sm">
            <li>
              <FileRef path="src/components/dashboard/analytics-section.tsx" /> — core panels layout
            </li>
            <li>
              <FileRef path="src/components/dashboard/analytics/advanced-analytics-section.tsx" /> —
              advanced panels
            </li>
            <li>
              <FileRef path="src/components/dashboard/analytics/advanced/*.tsx" /> — individual
              advanced panels
            </li>
            <li>
              <FileRef path="src/components/dashboard/markov-graph-overlay.tsx" /> — switch map
              overlay
            </li>
            <li>
              <FileRef path="src/components/dashboard/markov-graph-canvas.tsx" /> — interactive
              canvas
            </li>
          </ul>
        </DocSection>

        <DocSection title="Web Workers">
          <ul className="grid gap-2 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>
              <strong>lastfm-derived-stats.worker</strong> — full snapshot derivation
            </li>
            <li>
              <strong>markov-force-layout.worker</strong> — force simulation (falls back inline on
              SSR/error)
            </li>
          </ul>
        </DocSection>

        <DocSection title="Constants reference">
          <ThresholdTable
            rows={[
              { name: "Session default gap", value: "2 h", usedIn: "listening-sessions.ts" },
              {
                name: "Session adaptive range",
                value: "90 min – 6 h",
                usedIn: "listening-sessions.ts",
              },
              {
                name: "Heavy repeat threshold",
                value: "10th play",
                usedIn: "listening-analytics.ts",
              },
              { name: "Overlap window", value: "30 days", usedIn: "listening-analytics.ts" },
              {
                name: "Top share limits",
                value: "5, 10, 25, 50",
                usedIn: "listening-analytics.ts",
              },
              { name: "Rank stable delta", value: "≤ 2", usedIn: "rank movement" },
              { name: "Markov min edge count", value: "3", usedIn: "markov-graph.ts" },
              { name: "Markov min source transitions", value: "8", usedIn: "markov-graph.ts" },
              {
                name: "Deep-dive focus",
                value: "≥ 0.72",
                usedIn: "advanced-listening-analytics.ts",
              },
              {
                name: "Nostalgia repeat rate",
                value: "≥ 0.55",
                usedIn: "advanced-listening-analytics.ts",
              },
              {
                name: "Explore discovery + entropy",
                value: "≥ 0.35 & ≥ 0.75",
                usedIn: "advanced-listening-analytics.ts",
              },
              { name: "Hawkes window", value: "30 min", usedIn: "advanced-listening-analytics.ts" },
              { name: "Pattern min count", value: "3", usedIn: "sequential patterns" },
              { name: "Transfer entropy margin", value: "0.12", usedIn: "transfer entropy" },
              { name: "Recurrence distance", value: "0.15", usedIn: "recurrence" },
              { name: "Anomaly threshold", value: "2.2", usedIn: "anomalies" },
              { name: "Album decay min plays", value: "8", usedIn: "album decay" },
              {
                name: "Inter-arrival min plays",
                value: "4 (2 session replays)",
                usedIn: "inter-arrival",
              },
              { name: "Graph co-occur min edge", value: "2", usedIn: "graph structure" },
              { name: "Max vibe groups", value: "24", usedIn: "markov-vibe-groups.ts" },
              { name: "Canvas edge budget", value: "250 / 1000", usedIn: "markov-graph-render.ts" },
              { name: "Compare max users", value: "4", usedIn: "compare dashboard" },
            ]}
          />
        </DocSection>

        <DocSection title="Types">
          <p>
            Main exported types:{" "}
            <code className="font-mono text-xs">SeriousListeningAnalytics</code>,{" "}
            <code className="font-mono text-xs">AdvancedListeningAnalytics</code>,{" "}
            <code className="font-mono text-xs">CompareAdvancedAnalytics</code>,{" "}
            <code className="font-mono text-xs">MarkovGraph</code>,{" "}
            <code className="font-mono text-xs">LastFmStatsSnapshot</code>.
          </p>
        </DocSection>
      </div>
    </>
  );
}
