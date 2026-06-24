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

export function TimeSeriesPage() {
  return (
    <>
      <DocsPageHeader
        title="Time series"
        description="Habit shifts, daily decomposition, Hurst exponent, autocorrelation, and recurrence."
      />
      <div className="grid gap-14">
        <DocLead>
          These panels treat your listening history as time series — looking for shifts, cycles,
          persistence, and repeating day profiles.
        </DocLead>

        <DocSection title="Habit shifts (change points)">
          <p>
            <code className="font-mono text-xs">deriveChangePoints()</code> — monthly series for
            volume, discovery rate, and Gini concentration.
          </p>
          <AlgorithmSteps
            steps={[
              "For each metric series, find index i (2 ≤ i ≤ n−2) maximizing |mean(after) − mean(before)|.",
              "Report up to 4 eras with metric name, before/after values.",
            ]}
          />
        </DocSection>

        <DocSection title="Daily play breakdown (decomposition)">
          <p>
            <code className="font-mono text-xs">deriveDecomposition()</code>
          </p>
          <AlgorithmSteps
            steps={[
              "Compute 7-day moving average as trend.",
              "Seasonal = value − trend.",
              "Residual = value − trend − seasonal (adjusted).",
              "weeklySeasonalityStrength = var(seasonal) / var(values), clamped 0–1.",
              "Trend direction: rising/falling if end trend differs from start by > ±10%.",
            ]}
          />
        </DocSection>

        <DocSection title="Day-to-day volume (DFA / Hurst)">
          <p>
            <code className="font-mono text-xs">deriveDfa()</code> — detrended fluctuation analysis
            on daily play counts.
          </p>
          <AlgorithmSteps
            steps={[
              "Use scales {4, 8, 16, 32} days.",
              "Compute fluctuation at each scale.",
              "Hurst = slope of log(fluctuation) vs log(scale).",
              "Clamp to [0.1, 0.9].",
            ]}
          />
          <ThresholdTable
            rows={[
              { name: "Persistent", value: "H > 0.55", usedIn: "Clustered high/low days" },
              { name: "Anti-persistent", value: "H < 0.45", usedIn: "Alternating days" },
              { name: "Random", value: "0.45–0.55", usedIn: "No clear memory" },
            ]}
          />
        </DocSection>

        <DocSection title="Daily play autocorrelation (PACF)">
          <p>
            <code className="font-mono text-xs">derivePacf()</code>
          </p>
          <Formula>maxLag = min(14, floor(n / 3))</Formula>
          <MetricTable
            rows={[
              {
                metric: "Predictability",
                meaning: "How much daily plays follow repeating patterns.",
                formula: "mean(|PACF lag|)",
              },
              {
                metric: "Strongest lag",
                meaning: "Day offset with highest absolute partial autocorrelation.",
                formula: "argmax |PACF(k)|",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Repeated day profiles (recurrence)">
          <p>
            <code className="font-mono text-xs">deriveRecurrence()</code> — each day as vector
            [volume, uniqueArtists, discoveryRate], normalized.
          </p>
          <AlgorithmSteps
            steps={[
              "Build recurrence matrix: days i,j similar if Euclidean distance < 0.15.",
              "recurrenceRate = fraction of day pairs that recur.",
              "determinism = share of recurrences on near-diagonal (±2 days).",
              "laminarity = vertical structure metric (staying in same state).",
            ]}
          />
          <ThresholdTable
            rows={[
              { name: "Distance threshold", value: "0.15", usedIn: "Day profile match" },
              { name: "Diagonal band", value: "±2 days", usedIn: "Determinism" },
            ]}
          />
        </DocSection>

        <DocSection title="Source">
          <p>
            UI:{" "}
            <FileRef path="src/components/dashboard/analytics/advanced/time-series-panels.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
