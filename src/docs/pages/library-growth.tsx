import {
  Callout,
  DocLead,
  DocSection,
  FileRef,
  MetricTable,
} from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

export function LibraryGrowthPage() {
  return (
    <>
      <DocsPageHeader
        title="Library growth"
        description="How your unique artist, album, and track counts grow over time."
      />
      <div className="grid gap-14">
        <DocLead>
          Library growth tracks cumulative uniqueness — how many distinct entities you have
          encountered across your synced scrobble history.
        </DocLead>

        <DocSection title="Cumulative counts">
          <p>
            Scrobbles are processed chronologically. Running sets of unique artist keys, album keys,
            and track keys are maintained. Each month records:
          </p>
          <ul className="grid gap-1 pl-5 [list-style-type:disc] marker:text-muted-foreground">
            <li>
              <strong>artists / albums / tracks</strong> — cumulative unique count at end of month
            </li>
            <li>
              <strong>newArtists / newAlbums / newTracks</strong> — entities first seen that month
            </li>
          </ul>
        </DocSection>

        <DocSection title="Recent growth windows">
          <p>
            From the <em>latest</em> scrobble timestamp, count entities whose first appearance falls
            within:
          </p>
          <MetricTable
            rows={[
              {
                metric: "30d growth",
                meaning: "New artists, albums, and tracks first seen in last 30 days.",
                formula: "firstSeen ≥ latest − 30d",
              },
              {
                metric: "90d growth",
                meaning: "Same for 90-day window.",
                formula: "firstSeen ≥ latest − 90d",
              },
              {
                metric: "365d growth",
                meaning: "Same for 365-day window.",
                formula: "firstSeen ≥ latest − 365d",
              },
            ]}
          />
          <Callout variant="assumption">
            Growth counts sum new artists + new albums + new tracks into one number per window (not
            separate per entity type in the headline metric).
          </Callout>
        </DocSection>

        <DocSection title="Charts">
          <p>
            Stacked bars show new entities added per month. Lines show cumulative totals. Uses chart
            opacity scaling from <FileRef path="src/utils/chart-intensity.ts" />.
          </p>
        </DocSection>

        <DocSection title="Source">
          <p>
            <FileRef path="src/lib/listening-analytics.ts" /> —{" "}
            <code className="font-mono text-xs">deriveLibraryGrowth()</code>
          </p>
          <p>
            UI: <FileRef path="src/components/dashboard/analytics/library-growth.tsx" />
          </p>
        </DocSection>
      </div>
    </>
  );
}
