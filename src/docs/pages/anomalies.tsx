import {
  AlgorithmSteps,
  DocLead,
  DocSection,
  FileRef,
  Formula,
  MetricTable,
  ThresholdTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function AnomaliesPage() {
  return (
    <>
      <DocsPageHeader
        title="Anomalies & phase space"
        description="Outlier sessions and recent daily stability in volume, diversity, and discovery."
      />
      <div className="grid gap-14">
        <DocLead>
          Anomaly detection flags sessions unlike your typical patterns. Phase space summarizes
          recent daily listening geometry.
        </DocLead>

        <DocSection title="Unusual sessions">
          <p>
            <code className="font-mono text-xs">deriveAnomalies()</code>
          </p>
          <p>Each session is a 6-dimensional feature vector:</p>
          <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>duration (minutes)</li>
            <li>track count</li>
            <li>focus</li>
            <li>artistEntropy</li>
            <li>discoveryRate</li>
            <li>repeatRate</li>
          </ul>
          <AlgorithmSteps
            steps={[
              "Z-score normalize each dimension across all sessions.",
              "Mahalanobis-like distance: sqrt(Σ zᵢ²) using diagonal covariance.",
              "Flag sessions with score > 2.2 as outliers; top 5 shown.",
              "Generate reason heuristics (duration/tracks > 2× mean, focus/discovery > mean + 0.25).",
            ]}
          />
          <ThresholdTable
            rows={[{ name: "Anomaly threshold", value: "2.2", usedIn: "Outlier z-score sum" }]}
          />
        </DocSection>

        <DocSection title="Recent daily summary (phase space)">
          <p>
            <code className="font-mono text-xs">derivePhaseSpace()</code> — last 40 days, each day
            has:
          </p>
          <MetricTable
            rows={[
              { metric: "Volume", meaning: "Play count.", formula: "daily scrobbles" },
              { metric: "Diversity", meaning: "Unique artists.", formula: "unique artist keys" },
              {
                metric: "Discovery rate",
                meaning: "New artist+track share.",
                formula: "new / total",
              },
              { metric: "Focus", meaning: "Top artist share.", formula: "top artist / total" },
            ]}
          />
          <Formula>
            {`attractorStability = 1 − (var(volume)/mean(volume)² + var(diversity)/mean(diversity)²) / 2

clamped to [0, 1]`}
          </Formula>
          <p>
            Higher stability means recent days look similar to each other in volume and diversity.
          </p>
        </DocSection>

        <DocSection title="Source">
          <p>
            UI: <FileRef path="src/components/dashboard/analytics/advanced/anomaly-panels.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
