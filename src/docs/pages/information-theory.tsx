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

export function InformationTheoryPage() {
  return (
    <>
      <DocsPageHeader
        title="Information & drift"
        description="Entropy, weekly new-vs-replay coupling, taste drift, play-order effects, and ergodicity."
      />
      <div className="grid gap-14">
        <DocLead>
          These panels measure variety, predictability, and how your taste distribution changes over
          time.
        </DocLead>

        <DocSection title="Artist variety (entropy)">
          <p>
            <code className="font-mono text-xs">deriveEntropy()</code>
          </p>
          <Formula>H = −Σ pᵢ log₂(pᵢ) over artist play shares</Formula>
          <p>
            <strong>Multi-scale entropy</strong> applies the same formula to daily volume and daily
            unique-artist count series at scales 1, 7, and 30 days (aggregated buckets).
          </p>
          <MetricTable
            rows={[
              {
                metric: "Artist spread",
                meaning: "Entropy of artist distribution across all plays.",
                formula: "Shannon entropy (log₂)",
              },
              {
                metric: "Play count variation",
                meaning: "Entropy of daily/weekly/monthly play totals.",
                formula: "multi-scale entropy on volume",
              },
              {
                metric: "Artist count variation",
                meaning: "Entropy of unique artists per day series.",
                formula: "multi-scale entropy on diversity",
              },
            ]}
          />
        </DocSection>

        <DocSection title="New music vs replays (transfer entropy)">
          <p>
            <code className="font-mono text-xs">deriveTransferEntropy()</code> — weekly lag-1
            Pearson correlations:
          </p>
          <MetricTable
            rows={[
              {
                metric: "New week → next replay share",
                meaning: "Does a discovery-heavy week predict more replays next week?",
                formula: "corr(discoveryₜ, replayₜ₊₁)",
              },
              {
                metric: "Replay week → next new share",
                meaning: "Does a replay-heavy week predict more discovery next week?",
                formula: "corr(replayₜ, discoveryₜ₊₁)",
              },
              {
                metric: "Pattern",
                meaning: "Which direction dominates.",
                formula: "margin > 0.12 and value ≥ 0.12",
              },
            ]}
          />
          <Callout variant="assumption">
            Labeled &quot;transfer entropy&quot; in code but implemented as lagged linear
            correlation, not the information-theoretic transfer entropy integral.
          </Callout>
        </DocSection>

        <DocSection title="Monthly taste change">
          <p>
            <code className="font-mono text-xs">deriveTasteDrift()</code> — total variation distance
            between consecutive monthly artist distributions:
          </p>
          <Formula>TV(P, Q) = ½ Σ |P(a) − Q(a)| over all artists a</Formula>
          <p>Reports last 18 months, average distance, and peak single-month shift.</p>
        </DocSection>

        <DocSection title="Play order effect (counterfactual)">
          <p>
            <code className="font-mono text-xs">deriveCounterfactual()</code>
          </p>
          <AlgorithmSteps
            steps={[
              "Compute sessionBurstConcentration (Gini-like on same-artist run lengths).",
              "Build counterfactual: interleave artist queues round-robin within each session.",
              "Compare actual vs shuffled streakiness.",
              "orderEffect = actualGini − shuffledGini.",
            ]}
          />
          <MetricTable
            rows={[
              {
                metric: "Actual streakiness",
                meaning: "How clustered same-artist runs are.",
                formula: "Σ (runLength/total)²",
              },
              {
                metric: "Scrambled streakiness",
                meaning: "Streakiness if order were maximally spread.",
                formula: "interleaved counterfactual",
              },
              {
                metric: "Order boost",
                meaning: "Extra clustering from your actual play order.",
                formula: "actual − scrambled",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Lifetime vs monthly top artist (ergodicity)">
          <p>
            <code className="font-mono text-xs">deriveErgodicity()</code>
          </p>
          <MetricTable
            rows={[
              {
                metric: "All-time #1 share",
                meaning: "Share of all plays by your top artist ever.",
                formula: "max artist count / total",
              },
              {
                metric: "Typical month #1 share",
                meaning: "Average of each month's top-artist share.",
                formula: "mean(monthly top share)",
              },
              {
                metric: "Difference",
                meaning: "Gap between time average and slice average.",
                formula: "|timeAvg − sliceAvg|",
              },
            ]}
          />
          <Callout variant="note">
            High divergence suggests your monthly listening is less dominated than your lifetime
            stats imply (or vice versa).
          </Callout>
        </DocSection>

        <DocSection title="Source">
          <p>
            UI:{" "}
            <FileRef path="src/components/dashboard/analytics/advanced/information-panels.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
