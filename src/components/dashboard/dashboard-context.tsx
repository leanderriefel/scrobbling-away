import { createContext, useContext, type ReactNode } from "react";

import type { LastFmPeriod, LastFmStatsSnapshot } from "@/lib/lastfm-stats-cache";

type DashboardContextValue = {
  selectedPeriod: LastFmPeriod;
  setSelectedPeriod: (period: LastFmPeriod) => void;
  snapshot: LastFmStatsSnapshot;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({
  children,
  selectedPeriod,
  setSelectedPeriod,
  snapshot,
}: DashboardContextValue & {
  children: ReactNode;
}) {
  return (
    <DashboardContext.Provider value={{ selectedPeriod, setSelectedPeriod, snapshot }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardSnapshot() {
  return useDashboardContext().snapshot;
}

export function useOptionalDashboardSnapshot() {
  return useContext(DashboardContext)?.snapshot;
}

export function useDashboardPeriod() {
  const { selectedPeriod, setSelectedPeriod } = useDashboardContext();

  return { selectedPeriod, setSelectedPeriod };
}

function useDashboardContext() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("Dashboard context is missing.");
  }

  return context;
}
