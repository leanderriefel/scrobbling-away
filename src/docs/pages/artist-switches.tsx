import {
  AlgorithmSteps,
  Callout,
  DocLead,
  DocSection,
  DocSubsection,
  FileRef,
  Formula,
  MetricTable,
  ThresholdTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function ArtistSwitchesPage() {
  return (
    <>
      <DocsPageHeader
        title="Artist switches"
        description="Markov chain model of artist-to-artist transitions within sessions, plus the interactive switch map."
      />
      <div className="grid gap-14">
        <DocLead>
          When you change artists during a session, the app builds a directed graph of transitions.
          Repeated switches become edges; the switch map visualizes this graph with force-directed
          layout and vibe-colored clusters.
        </DocLead>

        <DocSection title="Graph construction">
          <p>
            <FileRef path="src/lib/markov-graph.ts" /> —{" "}
            <code className="font-mono text-xs">buildSessionMarkovGraph()</code>
          </p>
          <AlgorithmSteps
            steps={[
              "Split scrobbles into sessions (adaptive gap).",
              "Within each session, walk plays in order.",
              "When artist changes (A → B), increment transition count A → B.",
              "Skip transitions where artist stays the same (same-artist streaks).",
              "Edge probability = count(A → B) / total outgoing transitions from A.",
            ]}
          />
        </DocSection>

        <DocSection title="Summary panel metrics">
          <MetricTable
            rows={[
              {
                metric: "Switches to settle",
                meaning: "Steps until session artist mix resembles long-run distribution.",
                formula: "power iteration until L1 distance < 0.2 (max 24 steps)",
              },
              {
                metric: "Order vs rankings",
                meaning: "KL divergence between stationary distribution and empirical play shares.",
                formula: "KL(stationary ∥ empirical)",
              },
              {
                metric: "Hub artists",
                meaning: "Artists frequently switched to or from.",
                formula: "(inFlow + outFlow) / totalTransitions, top 5",
              },
              {
                metric: "Top switches",
                meaning: "Most common A → B pairs with enough data.",
                formula: "count ≥ 3, source outTransitions ≥ 8",
              },
            ]}
          />
          <ThresholdTable
            rows={[
              { name: "MARKOV_MIN_PAIR_COUNT", value: "3", usedIn: "Min transitions to list edge" },
              {
                name: "MARKOV_MIN_SOURCE_TRANSITIONS",
                value: "8",
                usedIn: "Min outgoing from source artist",
              },
              { name: "Power iteration max", value: "24 steps", usedIn: "Mixing time estimate" },
              { name: "Convergence", value: "L1 < 0.2", usedIn: "Stop power iteration" },
              { name: "topArtistLimit", value: "40", usedIn: "Artists in summary graph" },
            ]}
          />
        </DocSection>

        <DocSection title="Switch map (overlay)">
          <DocSubsection title="Opening the map">
            <p>
              Click &quot;Open switch map&quot; in the Artist switches panel. The overlay rebuilds
              the full graph from IndexedDB and runs layout in a Web Worker.
            </p>
          </DocSubsection>

          <DocSubsection title="Vibe groups">
            <p>
              <FileRef path="src/lib/markov-vibe-groups.ts" /> —{" "}
              <code className="font-mono text-xs">detectVibeGroups()</code>
            </p>
            <AlgorithmSteps
              steps={[
                "Label propagation (18 passes): each node adopts weighted neighbor label.",
                "Edge weight = transition count (filtered by clusterMinCount).",
                "Communities sorted by total outgoing transition weight.",
                "Single-artist orphans with low internal switches → 'Other switches'.",
                "Cap at 24 groups; overflow merged into Other.",
              ]}
            />
            <p>16 distinct colors assigned; gray (#6b7280) for &quot;Other switches&quot;.</p>
          </DocSubsection>

          <DocSubsection title="Force layout">
            <p>
              <FileRef path="src/lib/markov-force-layout.ts" /> + worker. Forces applied:
            </p>
            <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
              <li>Repulsion between nodes (pairwise if N ≤ 600, else grid-accelerated)</li>
              <li>Spring attraction along edges (strength ∝ transition count)</li>
              <li>Inter-cluster centroid repulsion</li>
              <li>Pull toward cluster centroid</li>
            </ul>
            <p>
              Iterations: 45–140 depending on node count. Node radius scales with outgoing
              transitions. Canvas normalized to ~1200 + √(n) × 20 px.
            </p>
          </DocSubsection>

          <DocSubsection title="Rendering">
            <p>
              <FileRef path="src/lib/markov-graph-render.ts" /> draws on canvas with:
            </p>
            <ThresholdTable
              rows={[
                {
                  name: "Edge budget (focused)",
                  value: "250",
                  usedIn: "Max edges when node selected",
                },
                { name: "Edge budget (unfocused)", value: "1000", usedIn: "Max edges otherwise" },
                {
                  name: "Semantic zoom",
                  value: "scale-based",
                  usedIn: "Hide weak edges when zoomed out",
                },
              ]}
            />
            <p>
              Selected node shows labels for itself and top 20 neighbors with probability and count.
              Edges use blended colors when crossing vibe groups.
            </p>
          </DocSubsection>
        </DocSection>

        <Callout variant="assumption">
          The Markov model only counts <strong>within-session</strong> switches. A break between
          sessions resets the chain — cross-session transitions are not edges.
        </Callout>

        <DocSection title="Mixing time algorithm">
          <Formula>
            {`Start from empirical play distribution π₀.
Repeatedly multiply by transition matrix P (row-stochastic).
Count steps until ||πₜ − πₜ₋₁||₁ < 0.2.`}
          </Formula>
        </DocSection>
      </div>
    </>
  );
}
