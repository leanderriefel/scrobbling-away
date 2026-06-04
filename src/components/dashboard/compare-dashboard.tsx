import type { LastFmPeriod, LastFmStatsSnapshot } from "@/lib/lastfm-stats-cache";
import { Tabs } from "@/components/ui/tabs";

import { CompareColumnLabel } from "./compare-column-label";
import { CompareColumns } from "./compare-columns";
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
}: CompareDashboardProps) => (
  <div className="mt-10 grid gap-16 pb-12">
    <section className="animate-section-in motion-reduce:animate-none grid gap-8">
      <SectionTitle description="Each listener keeps their own column so the same metric is easy to scan across users.">
        Compare listeners
      </SectionTitle>
      <CompareColumns
        snapshots={snapshots}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        renderColumn={() => <UserHeader variant="compare" />}
      />
    </section>

    <section className="animate-section-in motion-reduce:animate-none grid gap-8">
      <SectionTitle description="Listening rhythm from cached scrobble history.">
        Listening shape
      </SectionTitle>
      <CompareColumns
        snapshots={snapshots}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        renderColumn={() => <ListeningRhythmPanel layout="column" />}
      />
    </section>

    <section className="animate-section-in motion-reduce:animate-none grid gap-5">
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
                <RankingsTrackList kind={kind} listHeight="24rem" header={<CompareColumnLabel />} />
              )}
            />
          )}
        />
      </Tabs>
    </section>

    <section className="animate-section-in motion-reduce:animate-none grid gap-5">
      <SectionTitle description="Artists that appear in every selected listener's ranked artists for the current period.">
        Shared overlap
      </SectionTitle>
      <SharedArtistOverlap snapshots={snapshots} selectedPeriod={selectedPeriod} />
    </section>
  </div>
);
