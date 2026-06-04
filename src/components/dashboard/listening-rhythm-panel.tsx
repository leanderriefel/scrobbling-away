import { getListeningSignature } from "@/utils/listening-signature";

import { CompareColumnLabel } from "./compare-column-label";
import { useDashboardSnapshot } from "./dashboard-context";
import { ListeningClock } from "./listening-clock";
import { MonthChart } from "./month-chart";
import { WeekdayChart } from "./weekday-chart";
import { YearChart } from "./year-chart";

type ListeningRhythmPanelProps = {
  layout: "column" | "dashboard";
};

export const ListeningRhythmPanel = ({ layout }: ListeningRhythmPanelProps) => {
  if (layout === "dashboard") {
    return (
      <div className="grid gap-8">
        <ListeningClock />
        <WeekdayChart />
        <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
          <MonthChart />
          <YearChart />
        </div>
      </div>
    );
  }

  return <ListeningRhythmColumn />;
};

const ListeningRhythmColumn = () => {
  const snapshot = useDashboardSnapshot();
  const signature = getListeningSignature(snapshot);
  const years = snapshot.derived.scrobblesByYear.slice(-8);

  return (
    <div className="grid min-w-0 content-start gap-6">
      <CompareColumnLabel />
      <div className="grid gap-3">
        <PeakRow label="Peak hour" value={signature.peakHour} />
        <PeakRow label="Peak day" value={signature.peakWeekday} />
        <PeakRow label="Peak month" value={signature.peakMonth} />
        <PeakRow label="Peak year" value={signature.peakYear} />
      </div>
      <ListeningClock compact />
      <MonthChart compact />
      <WeekdayChart compact />
      <YearChart compact buckets={years} />
    </div>
  );
};

const PeakRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 items-baseline justify-between gap-4">
    <div className="shrink-0 text-[11px] text-muted-foreground">{label}</div>
    <div className="min-w-0 truncate text-right font-mono text-sm font-semibold tabular-nums">
      {value}
    </div>
  </div>
);
