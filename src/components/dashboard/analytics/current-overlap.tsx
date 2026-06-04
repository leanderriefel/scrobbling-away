import type { CurrentHistoricalOverlapStats } from "@/lib/listening-analytics";
import { formatCompact, formatNumber, formatPercent } from "@/utils/format";

import { AnalyticsPanel } from "./analytics-panel";
import { decimalFormatter } from "./formatters";
import { Metric } from "./metric";
import { MiniLabel } from "./mini-label";

export function CurrentOverlap({ analytics }: { analytics: CurrentHistoricalOverlapStats }) {
  return (
    <AnalyticsPanel
      title="Current vs historical"
      description="Recent top listening compared with all listening history."
    >
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Artist overlap"
          value={formatNumber(analytics.artist.overlapCount)}
          help="Artists appearing in both recent and historical top lists."
        />
        <Metric
          label="Jaccard"
          value={decimalFormatter.format(analytics.artist.jaccard)}
          help="Overlap divided by all artists across both lists. Formula: intersection / union."
        />
        <Metric
          label="Recent from all-time"
          value={formatPercent(analytics.recentShareFromAllTimeTopArtists)}
          help="Recent scrobbles belonging to all-time top artists."
        />
        <Metric
          label="Window"
          value={`${analytics.currentWindowDays}d`}
          help="Current listening uses the last 30 days of scrobbles."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <RankedMiniList
          label="Recent-only"
          help="Top recent items missing from the historical top list."
          items={analytics.artist.recentOnly}
        />
        <RankedMiniList
          label="Historical-only"
          help="Historical top items missing from recent listening."
          items={analytics.artist.historicalOnly}
        />
      </div>
    </AnalyticsPanel>
  );
}

function RankedMiniList({
  label,
  help,
  items,
}: {
  label: string;
  help: string;
  items: Array<{ id: string; label: string; detail?: string; count: number }>;
}) {
  return (
    <div className="grid gap-2">
      <MiniLabel label={label} help={help} />
      <div className="grid gap-px">
        {items.length > 0 ? (
          items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded px-2 py-1.5 text-xs hover:bg-accent/50"
            >
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                {item.detail && (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.detail}
                  </span>
                )}
              </span>
              <span className="font-mono text-muted-foreground">{formatCompact(item.count)}</span>
            </div>
          ))
        ) : (
          <div className="py-5 text-center text-xs text-muted-foreground">No items</div>
        )}
      </div>
    </div>
  );
}
