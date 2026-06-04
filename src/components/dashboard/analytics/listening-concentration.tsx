import type { ListeningConcentrationStats } from "@/lib/listening-analytics";
import { chartValueOpacity } from "@/utils/chart-intensity";
import { formatNumber, formatPercent } from "@/utils/format";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { AnalyticsPanel } from "./analytics-panel";
import { EmptyChart } from "./empty-chart";
import { decimalFormatter } from "./formatters";
import { Metric } from "./metric";
import { MiniLabel } from "./mini-label";

export function ListeningConcentration({ analytics }: { analytics: ListeningConcentrationStats }) {
  const top10 = analytics.artistTopShares.find((share) => share.limit === 10)?.share ?? 0;

  return (
    <AnalyticsPanel
      title="Listening concentration"
      description="How much listening is concentrated in the highest-played artists."
    >
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Top 10 share"
          value={formatPercent(top10)}
          help="Share of scrobbles belonging to the top-ranked artists. Formula: top artist scrobbles / total scrobbles."
        />
        <Metric
          label="Artists to 80%"
          value={formatNumber(analytics.artistsFor80Percent)}
          help="Fewest artists needed to cover 80% of scrobbles."
        />
        <Metric
          label="Gini"
          value={decimalFormatter.format(analytics.artistGini)}
          help="Concentration score from 0 to 1; higher means fewer artists dominate."
        />
        <Metric
          label="Artists to 50%"
          value={formatNumber(analytics.artistsFor50Percent)}
          help="Fewest artists needed to cover 50% of scrobbles."
        />
      </div>
      <div className="grid gap-4">
        <MiniLabel
          label="Artist share"
          help="Shows how much of your listening is covered by your most-played artists."
        />
        <ArtistShareDiagram
          shares={analytics.artistTopShares}
          artistsFor50Percent={analytics.artistsFor50Percent}
          artistsFor80Percent={analytics.artistsFor80Percent}
        />
      </div>
    </AnalyticsPanel>
  );
}

function ArtistShareDiagram({
  shares,
  artistsFor50Percent,
  artistsFor80Percent,
}: {
  shares: Array<{ limit: number; share: number }>;
  artistsFor50Percent: number;
  artistsFor80Percent: number;
}) {
  if (shares.length === 0) return <EmptyChart />;

  const maxShare = Math.max(...shares.map((entry) => entry.share));

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {shares.map((share) => (
          <Tooltip key={share.limit}>
            <TooltipTrigger
              render={
                <div
                  className="grid grid-cols-[3.75rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs outline-none"
                  tabIndex={0}
                />
              }
            >
              <span className="font-mono text-muted-foreground">Top {share.limit}</span>
              <div className="h-2 overflow-hidden rounded-sm bg-chart-track">
                <div
                  className="h-full rounded-sm bg-chart-1 transition-opacity duration-200 hover:opacity-100"
                  style={{
                    width: `${Math.max(2, share.share * 100)}%`,
                    opacity: chartValueOpacity(maxShare > 0 ? share.share / maxShare : 0),
                  }}
                />
              </div>
              <span className="text-right font-mono text-muted-foreground">
                {formatPercent(share.share)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Top {share.limit} artists account for {formatPercent(share.share)} of scrobbles.
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ThresholdBlock
          label="50% reached by"
          value={`${formatNumber(artistsFor50Percent)} artists`}
          help="How many top artists are needed to cover half your scrobbles."
        />
        <ThresholdBlock
          label="80% reached by"
          value={`${formatNumber(artistsFor80Percent)} artists`}
          help="How many top artists are needed to cover most of your scrobbles."
        />
      </div>
    </div>
  );
}

function ThresholdBlock({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className="min-w-0 rounded-sm bg-muted/30 px-3 py-2 outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
            tabIndex={0}
          />
        }
      >
        <div className="truncate font-mono text-sm font-semibold">{value}</div>
        <div className="mt-1 truncate text-[11px] text-muted-foreground">{label}</div>
      </TooltipTrigger>
      <TooltipContent>{help}</TooltipContent>
    </Tooltip>
  );
}
