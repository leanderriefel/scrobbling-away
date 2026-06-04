import type { DiscoveryReplayStats, DiscoveryReplayMonth } from "@/lib/listening-analytics";
import { formatCompact, formatPercent } from "@/utils/format";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { AnalyticsPanel } from "./analytics-panel";
import { EmptyChart } from "./empty-chart";
import { Legend } from "./legend";
import { Metric } from "./metric";

export function DiscoveryReplay({ analytics }: { analytics: DiscoveryReplayStats }) {
  return (
    <AnalyticsPanel
      title="Discovery vs replay"
      description="Scrobbles split into first-time track scrobbles, repeats, and heavy repeats."
    >
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="New scrobbles"
          value={formatCompact(analytics.newPlays)}
          help="First scrobble of an artist-track pair."
        />
        <Metric
          label="Repeats"
          value={formatCompact(analytics.repeatPlays)}
          help="Second through ninth scrobble of the same artist-track pair."
        />
        <Metric
          label="Heavy"
          value={formatCompact(analytics.heavyRepeatPlays)}
          help="Tenth or later scrobble of the same artist-track pair."
        />
      </div>
      <Metric
        label="Discovery rate"
        value={formatPercent(analytics.discoveryRate)}
        help="Share of scrobbles that were first-time track scrobbles. Formula: new scrobbles / total scrobbles."
      />
      <Legend
        items={[
          { label: "New", className: "bg-primary" },
          { label: "Repeat", className: "bg-chart-3" },
          { label: "Heavy", className: "bg-chart-4" },
        ]}
      />
      <StackedReplayBars months={analytics.months.slice(-12)} />
    </AnalyticsPanel>
  );
}

function StackedReplayBars({ months }: { months: DiscoveryReplayMonth[] }) {
  if (months.length === 0) return <EmptyChart />;

  return (
    <div className="flex h-24 items-end gap-1">
      {months.map((month) => (
        <Tooltip key={month.label}>
          <TooltipTrigger
            render={
              <div
                className="flex h-full flex-1 flex-col justify-end overflow-hidden rounded-sm bg-muted/50 outline-none ring-primary/30 transition-opacity hover:opacity-80 focus-visible:ring-2"
                tabIndex={0}
              />
            }
          >
            <div
              className="bg-chart-4"
              style={{
                height: `${month.total > 0 ? (month.heavyRepeatPlays / month.total) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-chart-3"
              style={{
                height: `${month.total > 0 ? (month.repeatPlays / month.total) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-primary"
              style={{
                height: `${month.total > 0 ? (month.newPlays / month.total) * 100 : 0}%`,
              }}
            />
          </TooltipTrigger>
          <TooltipContent>
            {month.label}: {formatCompact(month.newPlays)} new · {formatCompact(month.repeatPlays)}{" "}
            repeat · {formatCompact(month.heavyRepeatPlays)} heavy
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
