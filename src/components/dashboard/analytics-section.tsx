import { AdvancedAnalyticsSection } from "./analytics/advanced-analytics-section";
import { CurrentOverlap } from "./analytics/current-overlap";
import { DiscoveryReplay } from "./analytics/discovery-replay";
import { LibraryGrowth } from "./analytics/library-growth";
import { ListeningConcentration } from "./analytics/listening-concentration";
import { ListeningSessions } from "./analytics/listening-sessions";
import { useDashboardSnapshot } from "./dashboard-context";
import { SectionTitle } from "./section-title";

export function AnalyticsSection() {
  const analytics = useDashboardSnapshot().derived.analytics;

  return (
    <div className="grid gap-6">
      <SectionTitle description="Deeper metrics calculated from scrobbles and Last.fm rankings.">
        Analytics
      </SectionTitle>
      <div className="columns-1 gap-x-10 lg:columns-2">
        <ListeningConcentration analytics={analytics.concentration} />
        <DiscoveryReplay analytics={analytics.discoveryReplay} />
        <LibraryGrowth analytics={analytics.libraryGrowth} />
        <ListeningSessions analytics={analytics.sessions} />
        <CurrentOverlap analytics={analytics.overlap} />
      </div>
      <AdvancedAnalyticsSection />
    </div>
  );
}
