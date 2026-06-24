import { Disc3Icon, LoaderCircleIcon, Mic2Icon, Music2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  deriveScrobbleStats,
  getAccountTimelineStart,
  getItemScrobbles,
  type ScrobbleStats,
} from "@/lib/item-scrobble-stats";
import { formatCompact, formatDateTime } from "@/utils/format";

import {
  getItemDetailTitle,
  toItemDetailFilter,
  useItemDetail,
  type ItemDetailSelection,
} from "./item-detail-context";
import { ListeningClock } from "./listening-clock";
import { HelpTooltip } from "./help-tooltip";
import { MonthChart } from "./month-chart";
import { PlayHistoryAreaChart } from "./play-history-area-chart";
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
        const [scrobbles, timelineStart] = await Promise.all([
          getItemScrobbles(selection.usernameLower, toItemDetailFilter(selection)),
          getAccountTimelineStart(selection.usernameLower),
        ]);

        if (cancelled) return;

        setStats(deriveScrobbleStats(scrobbles, selection.kind, timelineStart));
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

      <PlayHistoryAreaChart points={stats.playHistoryTimeline} />

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
          <p className="text-xs text-muted-foreground">@{selection.username}</p>
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
          help="Months with at least one play for this item."
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
  <div className="relative pl-4 py-2 border-l border-primary/20 transition-all duration-300 hover:border-primary/60">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-medium">
      <span>{label}</span>
      {help ? <HelpTooltip>{help}</HelpTooltip> : null}
    </div>
    <div className="mt-1 font-mono text-[15px] font-normal tabular-nums text-foreground">
      {value}
    </div>
  </div>
);
