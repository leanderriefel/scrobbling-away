import { Disc3Icon, LoaderCircleIcon, Mic2Icon, Music2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { ChartBar } from "@/components/dashboard/analytics/chart-bar";
import {
  deriveScrobbleStats,
  getItemScrobbles,
  type ScrobbleStats,
} from "@/lib/item-scrobble-stats";
import { formatCompact, formatDateTime, formatNumber } from "@/utils/format";

import {
  getItemDetailKindLabel,
  getItemDetailTitle,
  toItemDetailFilter,
  useItemDetail,
  type ItemDetailSelection,
} from "./item-detail-context";
import { ListeningClock } from "./listening-clock";
import { MonthChart } from "./month-chart";
import { SubpageShell } from "./subpage-shell";
import { WeekdayChart } from "./weekday-chart";
import { YearChart } from "./year-chart";

export const ItemDetailOverlay = () => {
  const { closeItemDetail, selection } = useItemDetail();

  if (!selection) return null;

  return (
    <SubpageShell onBack={closeItemDetail} title={getItemDetailTitle(selection)}>
      <ItemDetailContent selection={selection} />
    </SubpageShell>
  );
};

const ItemDetailContent = ({ selection }: { selection: ItemDetailSelection }) => {
  const [stats, setStats] = useState<ScrobbleStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    setStats(null);

    void (async () => {
      try {
        const scrobbles = await getItemScrobbles(
          selection.usernameLower,
          toItemDetailFilter(selection),
        );

        if (cancelled) return;

        setStats(deriveScrobbleStats(scrobbles, selection.kind));
      } catch {
        if (cancelled) return;

        setError(`Could not load play history for this ${selection.kind}.`);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selection]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading play history…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        {error ?? `No play history found for this ${selection.kind}.`}
      </div>
    );
  }

  const playCount = Math.max(stats.totalPlays, selection.playCount ?? 0);

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <ItemDetailHeader playCount={playCount} selection={selection} stats={stats} />

      <PlayHistoryChart buckets={stats.playHistory} />

      <ListeningClock buckets={stats.scrobblesByHour} />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <YearChart buckets={stats.scrobblesByYear} />
        <MonthChart buckets={stats.scrobblesByMonthOfYear} />
        <WeekdayChart buckets={stats.scrobblesByWeekday} />
      </div>
    </div>
  );
};

const ItemDetailHeader = ({
  playCount,
  selection,
  stats,
}: {
  playCount: number;
  selection: ItemDetailSelection;
  stats: ScrobbleStats;
}) => {
  const { Icon, subtitle, title } = getHeaderMeta(selection);

  return (
    <div className="grid gap-5">
      <div className="flex min-w-0 items-start gap-4">
        {selection.imageUrl ? (
          <img
            src={selection.imageUrl}
            alt=""
            className="size-20 shrink-0 rounded-lg object-cover shadow-sm"
            loading="lazy"
          />
        ) : (
          <span className="grid size-20 shrink-0 place-items-center rounded-lg bg-muted/60">
            <Icon className="size-7 text-muted-foreground/50" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            @{selection.username} · {getItemDetailKindLabel(selection.kind)}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Plays" value={formatCompact(playCount)} />
        <StatCard
          label="First heard"
          value={
            stats.firstPlayedAt ? (formatDateTime(stats.firstPlayedAt).split(",")[0] ?? "—") : "—"
          }
        />
        <StatCard
          label="Last heard"
          value={
            stats.lastPlayedAt ? (formatDateTime(stats.lastPlayedAt).split(",")[0] ?? "—") : "—"
          }
        />
        <StatCard
          label="Months active"
          value={formatCompact(stats.playHistory.length)}
          help="Months with at least one play in cached history"
        />
        {stats.uniqueTracks !== undefined ? (
          <StatCard label="Unique tracks" value={formatCompact(stats.uniqueTracks)} />
        ) : null}
        {stats.uniqueAlbums !== undefined ? (
          <StatCard label="Unique albums" value={formatCompact(stats.uniqueAlbums)} />
        ) : null}
      </div>
    </div>
  );
};

const getHeaderMeta = (selection: ItemDetailSelection) => {
  switch (selection.kind) {
    case "artist":
      return {
        Icon: Mic2Icon,
        subtitle: undefined,
        title: selection.artistName,
      };
    case "album":
      return {
        Icon: Disc3Icon,
        subtitle: selection.artistName,
        title: selection.albumName,
      };
    case "track":
      return {
        Icon: Music2Icon,
        subtitle: selection.artistName,
        title: selection.trackName,
      };
  }
};

const StatCard = ({ help, label, value }: { help?: string; label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="mt-1 font-mono text-sm font-semibold tabular-nums">{value}</div>
    {help ? (
      <div className="mt-1 text-[10px] leading-snug text-muted-foreground/80">{help}</div>
    ) : null}
  </div>
);

const PlayHistoryChart = ({ buckets }: { buckets: ScrobbleStats["playHistory"] }) => {
  if (buckets.length === 0) {
    return (
      <div className="grid gap-3">
        <PlayHistoryTitle />
        <div className="py-8 text-center text-sm text-muted-foreground">No play history yet</div>
      </div>
    );
  }

  const visibleBuckets = buckets.slice(-24);
  const max = Math.max(1, ...visibleBuckets.map((bucket) => bucket.count));
  const ratios = visibleBuckets.map((bucket) => bucket.count / max);

  return (
    <div className="grid gap-4">
      <PlayHistoryTitle />
      <div className="flex h-32 items-end gap-1">
        {visibleBuckets.map((bucket, index) => (
          <div key={`${bucket.label}-${index}`} className="relative flex h-full flex-1 items-end">
            <ChartBar
              value={ratios[index] ?? 0}
              leftValue={ratios[index - 1]}
              rightValue={ratios[index + 1]}
              minHeightPercent={6}
              className="animate-bar-grow origin-bottom motion-reduce:animate-none bg-chart-1"
              animationDelayMs={index * 30}
              tooltip={`${bucket.label} · ${formatNumber(bucket.count)} plays`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground/60">
        <span>{visibleBuckets[0]?.label}</span>
        <span>{visibleBuckets.at(-1)?.label}</span>
      </div>
    </div>
  );
};

const PlayHistoryTitle = () => (
  <div className="grid gap-1">
    <h3 className="text-sm font-medium">Play history</h3>
    <p className="text-xs text-muted-foreground">
      Plays per month from your cached scrobble history.
    </p>
  </div>
);
