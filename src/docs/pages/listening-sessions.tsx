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

export function ListeningSessionsPage() {
  return (
    <>
      <DocsPageHeader
        title="Listening sessions"
        description="How scrobbles are grouped into sessions, and what every session metric measures."
      />
      <div className="grid gap-14">
        <DocLead>
          A listening session is a contiguous block of scrobbles with no gap longer than a
          threshold. That threshold is learned from your pause patterns — not a universal constant.
        </DocLead>

        <DocSection title="Adaptive session gap">
          <p>
            Implemented in <FileRef path="src/lib/listening-sessions.ts" /> as{" "}
            <code className="font-mono text-xs">resolveSessionGapSeconds()</code>.
          </p>
          <AlgorithmSteps
            steps={[
              "Collect inter-scrobble gaps between 10 minutes and 6 hours (pause candidates).",
              "If fewer than 8 pause samples exist, use the default gap of 2 hours.",
              "Otherwise: gap = median(pauseGaps) × 1.35, clamped to [90 min, 6 h].",
              "A new session starts when the gap between consecutive scrobbles ≥ gap.",
            ]}
          />
          <ThresholdTable
            rows={[
              {
                name: "PAUSE_GAP_FLOOR_SECONDS",
                value: "10 min",
                usedIn: "Minimum gap counted as a pause",
              },
              { name: "MIN_PAUSE_SAMPLES", value: "8", usedIn: "Pauses needed for adaptive mode" },
              {
                name: "DEFAULT_SESSION_GAP_SECONDS",
                value: "2 h",
                usedIn: "Fallback when too few pauses",
              },
              { name: "MIN_SESSION_GAP_SECONDS", value: "90 min", usedIn: "Adaptive gap floor" },
              { name: "MAX_SESSION_GAP_SECONDS", value: "6 h", usedIn: "Adaptive gap ceiling" },
              { name: "Multiplier", value: "× 1.35", usedIn: "Applied to median pause" },
            ]}
          />
          <Callout variant="assumption">
            Scrobbles with missing or zero timestamps are still included in sessions but cannot
            trigger a gap-based split on their own.
          </Callout>
        </DocSection>

        <DocSection title="Session metrics">
          <MetricTable
            rows={[
              {
                metric: "Sessions",
                meaning: "Total number of listening sessions detected.",
                formula: "splitListeningSessions().length",
              },
              {
                metric: "Avg duration",
                meaning: "Mean time from first to last scrobble in a session.",
                formula: "(lastTimestamp − firstTimestamp) / 60, rounded",
              },
              {
                metric: "Median duration",
                meaning: "Median session length in minutes.",
                formula: "median(session durations)",
              },
              {
                metric: "Tracks/session",
                meaning: "Average scrobbles per session.",
                formula: "mean(session.length)",
              },
              {
                metric: "Session focus",
                meaning: "How much of a session belongs to its top artist.",
                formula: "topArtistPlays / sessionLength, averaged",
              },
              {
                metric: "Avg artists",
                meaning: "Mean unique artists per session.",
                formula: "mean(unique artists per session)",
              },
              {
                metric: "Longest session",
                meaning: "Maximum session duration in minutes.",
                formula: "max(session durations)",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Duration buckets">
          <p>Sessions are counted into fixed buckets for the bar chart:</p>
          <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>&lt;15m</li>
            <li>15–29m</li>
            <li>30–59m</li>
            <li>1–2h</li>
            <li>2h+</li>
          </ul>
          <p>
            Duration = last scrobble timestamp minus first scrobble timestamp within the session
            (not sum of track lengths).
          </p>
        </DocSection>

        <DocSection title="Session features (advanced)">
          <DocSubsection title="Used by advanced analytics">
            <p>
              Each session is also summarized into features in{" "}
              <FileRef path="src/lib/advanced-listening-analytics.ts" />:
            </p>
            <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
              <li>
                <strong>focus</strong> — top artist share (same as session focus)
              </li>
              <li>
                <strong>discoveryRate</strong> — share of first-time artist+track pairs in session
              </li>
              <li>
                <strong>repeatRate</strong> — share of non-first plays in session
              </li>
              <li>
                <strong>artistEntropy</strong> — Shannon entropy (log₂) of artist distribution
                within session
              </li>
            </ul>
            <p>These feed session type classification, anomalies, and more.</p>
          </DocSubsection>
        </DocSection>

        <DocSection title="Focus formula">
          <Formula>
            {`sessionFocus = (plays by session's most-played artist) / (total plays in session)

averageFocus = mean(sessionFocus) across all sessions`}
          </Formula>
        </DocSection>
      </div>
    </>
  );
}
