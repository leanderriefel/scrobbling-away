import type { LastFmPeriod, LastFmStatsSnapshot } from "@/lib/lastfm-stats-cache";
import { deriveCompareAdvancedAnalytics } from "@/lib/compare-advanced-analytics";
import { Tabs } from "@/components/ui/tabs";

import { CompareAdvancedAnalyticsSection } from "./analytics/advanced-analytics-section";
import { CompareColumnLabel } from "./compare-column-label";
import { CompareColumns } from "./compare-columns";
import { DashboardSection } from "./dashboard-section";
import { ListeningRhythmPanel } from "./listening-rhythm-panel";
import { PeriodSelect } from "./period-select";
import { RankingsTabList, RankingsTabPanels, RankingsTrackList } from "./rankings";
import { SectionTitle } from "./section-title";
import { SharedArtistOverlap } from "./shared-artist-overlap";
import { UserHeader } from "./user-header";

type CompareDashboardProps = {
  snapshots: LastFmStatsSnapshot[];
  selectedPeriod: LastFmPeriod;
  setSelectedPeriod: (period: LastFmPeriod) => void;
};

export const CompareDashboard = ({
  snapshots,
  selectedPeriod,
  setSelectedPeriod,
}: CompareDashboardProps) => {
  const compareAdvanced = deriveCompareAdvancedAnalytics(snapshots);

  return (
    <div className="grid gap-0">
      <DashboardSection>
        <SectionTitle description="Each listener in their own column for side-by-side scanning.">
          Compare listeners
        </SectionTitle>
        <CompareColumns
          snapshots={snapshots}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          renderColumn={() => <UserHeader variant="compare" />}
        />
      </DashboardSection>

      <DashboardSection>
        <SectionTitle description="Listening rhythm from scrobble history.">
          Listening shape
        </SectionTitle>
        <CompareColumns
          snapshots={snapshots}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          renderColumn={() => <ListeningRhythmPanel layout="column" />}
        />
      </DashboardSection>

      <DashboardSection>
        <SectionTitle
          action={<PeriodSelect value={selectedPeriod} onValueChange={setSelectedPeriod} />}
          description="Ranked artists, albums, and tracks for the selected Last.fm period."
        >
          Most played
        </SectionTitle>
        <Tabs defaultValue="artists">
          <RankingsTabList />
          <RankingsTabPanels
            listHeight="24rem"
            renderPanel={(kind) => (
              <CompareColumns
                snapshots={snapshots}
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
                renderColumn={() => (
                  <RankingsTrackList
                    kind={kind}
                    listHeight="24rem"
                    header={<CompareColumnLabel />}
                  />
                )}
              />
            )}
          />
        </Tabs>
      </DashboardSection>

      <DashboardSection>
        <SectionTitle description="Artists in every listener's ranked list for this period.">
          Shared overlap
        </SectionTitle>
        <SharedArtistOverlap snapshots={snapshots} selectedPeriod={selectedPeriod} />
      </DashboardSection>

      <DashboardSection>
        <CompareAdvancedAnalyticsSection analytics={compareAdvanced} />
      </DashboardSection>
    </div>
  );
};
