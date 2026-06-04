import type { LibraryGrowthMonth, LibraryGrowthStats } from "@/lib/listening-analytics";
import { formatCompact } from "@/utils/format";

import { AnalyticsPanel } from "./analytics-panel";
import { ChartBar } from "./chart-bar";
import { EmptyChart } from "./empty-chart";
import { Legend } from "./legend";
import { Metric } from "./metric";
import { MiniLabel } from "./mini-label";

export function LibraryGrowth({ analytics }: { analytics: LibraryGrowthStats }) {
  const latest = analytics.months.at(-1);

  return (
    <AnalyticsPanel
      title="Library growth"
      description="Unique artists, albums, and tracks accumulated over time."
    >
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="Artists"
          value={formatCompact(latest?.artists ?? 0)}
          help="Unique artists accumulated over time."
        />
        <Metric
          label="Albums"
          value={formatCompact(latest?.albums ?? 0)}
          help="Unique albums accumulated over time."
        />
        <Metric
          label="Tracks"
          value={formatCompact(latest?.tracks ?? 0)}
          help="Unique tracks accumulated over time."
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="30d growth"
          value={formatCompact(analytics.growth30Days)}
          help="New artists, albums, and tracks first seen in the last 30 days."
        />
        <Metric
          label="90d growth"
          value={formatCompact(analytics.growth90Days)}
          help="New artists, albums, and tracks first seen in the last 90 days."
        />
        <Metric
          label="365d growth"
          value={formatCompact(analytics.growth365Days)}
          help="New artists, albums, and tracks first seen in the last 365 days."
        />
      </div>
      <GrowthLines months={analytics.months} />
      <MonthlyNewBars months={analytics.months} />
    </AnalyticsPanel>
  );
}

function GrowthLines({ months }: { months: LibraryGrowthMonth[] }) {
  if (months.length === 0) return <EmptyChart />;

  const max = Math.max(
    1,
    ...months.flatMap((month) => [month.artists, month.albums, month.tracks]),
  );
  const artistRatios = months.map((month) => month.artists / max);
  const albumRatios = months.map((month) => month.albums / max);
  const trackRatios = months.map((month) => month.tracks / max);

  return (
    <div className="grid gap-2">
      <MiniLabel
        label="Library growth"
        help="Unique artists, albums, or tracks accumulated over time."
      />
      <Legend
        items={[
          { label: "Artists", className: "bg-chart-1" },
          { label: "Albums", className: "bg-chart-2" },
          { label: "Tracks", className: "bg-chart-4" },
        ]}
      />
      <div className="overflow-x-auto scrollbar-thin">
        <div
          className="flex h-20 items-end gap-1"
          style={{ minWidth: `${Math.max(months.length * 10, 100)}%` }}
        >
          {months.map((month, index) => (
            <div key={month.label} className="relative flex h-full min-w-2 flex-1 items-end gap-px">
              <ChartBar
                value={artistRatios[index] ?? 0}
                leftValue={artistRatios[index - 1]}
                rightValue={artistRatios[index + 1]}
                className="bg-chart-1"
                tooltip={`${month.label}: ${formatCompact(month.artists)} artists`}
              />
              <ChartBar
                value={albumRatios[index] ?? 0}
                leftValue={albumRatios[index - 1]}
                rightValue={albumRatios[index + 1]}
                className="bg-chart-2"
                tooltip={`${month.label}: ${formatCompact(month.albums)} albums`}
              />
              <ChartBar
                value={trackRatios[index] ?? 0}
                leftValue={trackRatios[index - 1]}
                rightValue={trackRatios[index + 1]}
                className="bg-chart-4"
                tooltip={`${month.label}: ${formatCompact(month.tracks)} tracks`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthlyNewBars({ months }: { months: LibraryGrowthMonth[] }) {
  if (months.length === 0) return null;

  const max = Math.max(
    1,
    ...months.map((month) => month.newArtists + month.newAlbums + month.newTracks),
  );
  const ratios = months.map(
    (month) => (month.newArtists + month.newAlbums + month.newTracks) / max,
  );

  return (
    <div className="grid gap-2">
      <MiniLabel
        label="New this month"
        help="Artists, albums, and tracks first seen during that month."
      />
      <div className="overflow-x-auto scrollbar-thin">
        <div
          className="flex h-14 items-end gap-1"
          style={{ minWidth: `${Math.max(months.length * 10, 100)}%` }}
        >
          {months.map((month, index) => (
            <div key={month.label} className="relative flex h-full min-w-2 flex-1 items-end">
              <ChartBar
                value={ratios[index] ?? 0}
                leftValue={ratios[index - 1]}
                rightValue={ratios[index + 1]}
                className="bg-chart-2"
                tooltip={`${month.label}: ${formatCompact(
                  month.newArtists + month.newAlbums + month.newTracks,
                )} new artists, albums, and tracks`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
