import {
  AlgorithmSteps,
  DocLead,
  DocSection,
  FileRef,
  MetricTable,
  ThresholdTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function RetentionPage() {
  return (
    <>
      <DocsPageHeader
        title="Retention & decay"
        description="Track replay survival, artist cohort retention, same-session repeats, and album half-life."
      />
      <div className="grid gap-14">
        <DocLead>
          These metrics describe how long tracks and artists stay in rotation, and how quickly album
          hype fades.
        </DocLead>

        <DocSection title="Track replays (survival)">
          <p>
            <code className="font-mono text-xs">deriveSurvival()</code>
          </p>
          <AlgorithmSteps
            steps={[
              "For each artist+track, record days between 1st and 2nd scrobble.",
              "neverReplayedShare = tracks with only 1 play / all unique tracks.",
              "Kaplan-Meier curve: survival at day d = share not yet replayed by day d.",
              "90-day horizon, weekly step points.",
            ]}
          />
          <MetricTable
            rows={[
              {
                metric: "Median days to replay",
                meaning: "Median delay for tracks that were replayed at least once.",
                formula: "median(inter-arrival days)",
              },
              {
                metric: "Never replayed",
                meaning: "One-and-done tracks.",
                formula: "single-play tracks / unique tracks",
              },
              {
                metric: "Survival curve",
                meaning: "Share still without replay after N days.",
                formula: "Kaplan-Meier estimator",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Artist retention (cohorts)">
          <p>
            <code className="font-mono text-xs">deriveCohortRetention()</code>
          </p>
          <AlgorithmSteps
            steps={[
              "Group artists by calendar month of first scrobble (last 8 cohorts).",
              "Retention at 30, 90, 180 days: share of cohort artists replayed after day 1 within horizon.",
              "Report average 90-day retention and per-cohort curve.",
            ]}
          />
        </DocSection>

        <DocSection title="Same-session replays (inter-arrival)">
          <p>
            <code className="font-mono text-xs">deriveInterArrival()</code> — different from
            survival: measures repeats <em>within</em> a session.
          </p>
          <ThresholdTable
            rows={[
              { name: "Min plays", value: "4", usedIn: "Include track" },
              { name: "Min session replays", value: "2", usedIn: "Include track" },
              { name: "Top list", value: "25 tracks", usedIn: "Ranking size" },
            ]}
          />
          <MetricTable
            rows={[
              {
                metric: "Same-session replay share",
                meaning: "Among ranked tracks, avg share of plays that are within-session repeats.",
                formula: "sessionReplayPlays / plays",
              },
              {
                metric: "Max in session",
                meaning: "Most plays of track in a single session.",
                formula: "max per-session count",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Album play decline">
          <p>
            <code className="font-mono text-xs">deriveAlbumDecay()</code>
          </p>
          <AlgorithmSteps
            steps={[
              "Build weekly play counts per album.",
              "Filter albums with ≥ 8 total plays.",
              "Find peak week; half-life = weeks until count ≤ peak/2 (min 7 days).",
              "Report top 8 albums and average half-life.",
            ]}
          />
        </DocSection>

        <DocSection title="Source">
          <p>
            UI: <FileRef path="src/components/dashboard/analytics/advanced/survival-panels.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
