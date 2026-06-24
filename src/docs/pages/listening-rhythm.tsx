import { DocLead, DocSection, FileRef, MetricTable } from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function ListeningRhythmPage() {
  return (
    <>
      <DocsPageHeader
        title="Listening rhythm"
        description="When you listen — by hour, weekday, month, and year."
      />
      <div className="grid gap-14">
        <DocLead>
          Rhythm charts are simple histograms of scrobble timestamps. They do not use sessions or
          discovery classification.
        </DocLead>

        <DocSection title="Charts">
          <MetricTable
            rows={[
              {
                metric: "Listening clock",
                meaning: "24-hour distribution of scrobble times (local timezone from timestamp).",
                formula: "count per hour bucket",
              },
              {
                metric: "Weekday chart",
                meaning: "Plays per day of week (Mon–Sun).",
                formula: "count per weekday",
              },
              {
                metric: "Month chart",
                meaning: "Plays per calendar month across history.",
                formula: "count per month key",
              },
              {
                metric: "Year chart",
                meaning: "Plays per calendar year.",
                formula: "count per year",
              },
            ]}
          />
        </DocSection>

        <DocSection title="Listening signature">
          <p>
            <FileRef path="src/utils/listening-signature.ts" /> derives summary peaks used in
            compare columns and user headers:
          </p>
          <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>Peak hour, weekday, month, year</li>
            <li>Repeat rate (non-new plays / total)</li>
            <li>Average scrobbles per day</li>
          </ul>
        </DocSection>

        <DocSection title="Source">
          <p>
            Derived in <FileRef path="src/lib/lastfm-derived-stats.ts" /> as{" "}
            <code className="font-mono text-xs">scrobblesByYear</code>, hour/weekday buckets, etc.
          </p>
          <p>
            UI: <FileRef path="src/components/dashboard/listening-rhythm-panel.tsx" />,{" "}
            <FileRef path="src/components/dashboard/listening-clock.tsx" />,{" "}
            <FileRef path="src/components/dashboard/weekday-chart.tsx" />,{" "}
            <FileRef path="src/components/dashboard/month-chart.tsx" />,{" "}
            <FileRef path="src/components/dashboard/year-chart.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
