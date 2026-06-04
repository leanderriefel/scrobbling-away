import type { ReactNode } from "react";

import type { LastFmPeriod, LastFmStatsSnapshot } from "@/lib/lastfm-stats-cache";

import { DashboardProvider } from "./dashboard-context";

export const CompareColumns = ({
  renderColumn,
  selectedPeriod,
  setSelectedPeriod,
  snapshots,
}: {
  renderColumn: () => ReactNode;
  selectedPeriod: LastFmPeriod;
  setSelectedPeriod: (period: LastFmPeriod) => void;
  snapshots: LastFmStatsSnapshot[];
}) => (
  <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
    {snapshots.map((snapshot) => (
      <DashboardProvider
        key={snapshot.id}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        snapshot={snapshot}
      >
        {renderColumn()}
      </DashboardProvider>
    ))}
  </div>
);
