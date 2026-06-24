import {
  DocLead,
  DocSection,
  FileRef,
  MetricTable,
  ThresholdTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function SessionTypesPage() {
  return (
    <>
      <DocsPageHeader
        title="Session types"
        description="How each listening session is classified and how types transition between sessions."
      />
      <div className="grid gap-14">
        <DocLead>
          Every session receives one of four labels based on its internal play distribution.
          Classification runs in <FileRef path="src/lib/advanced-listening-analytics.ts" /> via{" "}
          <code className="font-mono text-xs">classifySessionMode()</code>.
        </DocLead>

        <DocSection title="Classification rules (first match wins)">
          <MetricTable
            rows={[
              {
                metric: "One artist (deep-dive)",
                meaning: "Session dominated by a single artist.",
                formula: "focus ≥ 0.72",
              },
              {
                metric: "Replays (nostalgia)",
                meaning: "Mostly previously heard tracks.",
                formula: "repeatRate ≥ 0.55",
              },
              {
                metric: "New music (explore)",
                meaning: "High discovery with diverse artists.",
                formula: "discoveryRate ≥ 0.35 AND artistEntropy ≥ 0.75",
              },
              {
                metric: "Mixed (shuffle)",
                meaning: "Default when no other rule matches.",
                formula: "fallback",
              },
            ]}
          />
          <ThresholdTable
            rows={[
              { name: "Deep-dive focus", value: "≥ 0.72", usedIn: "One artist mode" },
              { name: "Nostalgia repeat rate", value: "≥ 0.55", usedIn: "Replays mode" },
              { name: "Explore discovery", value: "≥ 0.35", usedIn: "New music mode" },
              { name: "Explore entropy", value: "≥ 0.75", usedIn: "New music mode" },
            ]}
          />
        </DocSection>

        <DocSection title="Session features used">
          <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>
              <strong>focus</strong> — top artist share in session
            </li>
            <li>
              <strong>repeatRate</strong> — non-first-time artist+track plays / total
            </li>
            <li>
              <strong>discoveryRate</strong> — first-time artist+track plays / total
            </li>
            <li>
              <strong>artistEntropy</strong> — Shannon entropy (log₂) of artist distribution
            </li>
          </ul>
        </DocSection>

        <DocSection title="Panel outputs">
          <MetricTable
            rows={[
              {
                metric: "Most common type",
                meaning: "Mode with highest share of sessions.",
                formula: "argmax(mode share)",
              },
              {
                metric: "Mode shares",
                meaning: "Bar chart of each type's session fraction.",
                formula: "sessions in mode / total sessions",
              },
              {
                metric: "Type transitions",
                meaning: "When one session ends and next begins, probability of mode change.",
                formula: "count(from→to) / count(from)",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Source">
          <p>
            <FileRef path="src/lib/advanced-listening-analytics.ts" /> —{" "}
            <code className="font-mono text-xs">deriveListeningModes()</code>
          </p>
          <p>
            UI labels: <FileRef path="src/components/dashboard/analytics/advanced/shared.tsx" />
          </p>
          <p>
            Panel:{" "}
            <FileRef path="src/components/dashboard/analytics/advanced/sequential-panels.tsx" /> —{" "}
            <code className="font-mono text-xs">ListeningModesPanel</code>
          </p>
        </DocSection>
      </div>
    </>
  );
}
