import { MONTH_LABELS } from "@/utils/calendar-labels";
import {
  fillYearlyBuckets,
  formatMonthKeyLong,
  formatMonthKeyShort,
  monthRangeKeys,
  resolveTimelineStart,
} from "@/utils/account-timeline";
import { albumKey, artistKey, trackKey } from "@/utils/track-keys";

import type { CachedRecentTrack, TimeBucket } from "./lastfm-stats-cache";
import { lastFmStatsDb } from "./lastfm-stats-cache";

export type ItemDetailKind = "album" | "artist" | "track";

export type ItemDetailFilter =
  | { kind: "artist"; artistName: string }
  | { kind: "album"; albumName: string; artistName: string }
  | { kind: "track"; artistName: string; trackName: string };

export type PlayHistoryPoint = {
  count: number;
  key: string;
  label: string;
  tooltipLabel: string;
};

export type ScrobbleStats = {
  scrobbles: CachedRecentTrack[];
  totalPlays: number;
  firstPlayedAt?: number;
  lastPlayedAt?: number;
  scrobblesByHour: TimeBucket[];
  scrobblesByWeekday: TimeBucket[];
  scrobblesByMonthOfYear: TimeBucket[];
  scrobblesByYear: TimeBucket[];
  playHistory: TimeBucket[];
  playHistoryTimeline: PlayHistoryPoint[];
  uniqueAlbums?: number;
  uniqueTracks?: number;
};

export const getAccountTimelineStart = async (
  usernameLower: string,
): Promise<number | undefined> => {
  const [profile, earliestTrack] = await Promise.all([
    lastFmStatsDb.profiles.get(usernameLower),
    lastFmStatsDb.recentTracks
      .where("usernameLower")
      .equals(usernameLower)
      .sortBy("playedAtTimestamp")
      .then((tracks) => tracks[0]),
  ]);

  return resolveTimelineStart(
    profile?.info.registered?.timestamp,
    earliestTrack?.playedAtTimestamp,
  );
};

export const getItemScrobbles = async (
  usernameLower: string,
  filter: ItemDetailFilter,
): Promise<CachedRecentTrack[]> => {
  const rows = await lastFmStatsDb.recentTracks
    .where("usernameLower")
    .equals(usernameLower)
    .toArray();

  const filtered = rows.filter((row) => matchesItemFilter(row, filter));

  return filtered.sort((left, right) => right.playedAtTimestamp - left.playedAtTimestamp);
};

const matchesItemFilter = (row: CachedRecentTrack, filter: ItemDetailFilter) => {
  switch (filter.kind) {
    case "artist":
      return artistKey(row.artistName) === artistKey(filter.artistName);
    case "album":
      return (
        albumKey(row.artistName, row.albumName) === albumKey(filter.artistName, filter.albumName)
      );
    case "track":
      return (
        trackKey(row.artistName, row.trackName) === trackKey(filter.artistName, filter.trackName)
      );
  }
};

export const deriveScrobbleStats = (
  scrobbles: CachedRecentTrack[],
  kind: ItemDetailKind,
  timelineStart?: number,
): ScrobbleStats => {
  const years = new Map<string, number>();
  const hours = new Map<string, number>();
  const weekdays = new Map<string, number>();
  const monthsOfYear = new Map<number, number>();
  const playHistory = new Map<string, number>();
  const uniqueTracks = new Set<string>();
  const uniqueAlbums = new Set<string>();

  let firstPlayedAt: number | undefined;
  let lastPlayedAt: number | undefined;

  for (const scrobble of scrobbles) {
    const playedAt = new Date(scrobble.playedAtTimestamp * 1000);
    const year = playedAt.getFullYear().toString();
    const hour = playedAt.getHours().toString().padStart(2, "0");
    const weekday = playedAt.toLocaleDateString(undefined, { weekday: "short" });
    const monthIndex = playedAt.getMonth();
    const historyKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

    if (firstPlayedAt === undefined || scrobble.playedAtTimestamp < firstPlayedAt) {
      firstPlayedAt = scrobble.playedAtTimestamp;
    }

    if (lastPlayedAt === undefined || scrobble.playedAtTimestamp > lastPlayedAt) {
      lastPlayedAt = scrobble.playedAtTimestamp;
    }

    years.set(year, (years.get(year) ?? 0) + 1);
    hours.set(hour, (hours.get(hour) ?? 0) + 1);
    weekdays.set(weekday, (weekdays.get(weekday) ?? 0) + 1);
    monthsOfYear.set(monthIndex, (monthsOfYear.get(monthIndex) ?? 0) + 1);
    playHistory.set(historyKey, (playHistory.get(historyKey) ?? 0) + 1);

    if (kind !== "track") {
      uniqueTracks.add(trackKey(scrobble.artistName, scrobble.trackName));
    }

    if (kind === "artist" && scrobble.albumName) {
      uniqueAlbums.add(albumKey(scrobble.artistName, scrobble.albumName));
    }
  }

  const historyStart = timelineStart ?? firstPlayedAt;

  return {
    scrobbles,
    totalPlays: scrobbles.length,
    firstPlayedAt,
    lastPlayedAt,
    scrobblesByHour: [...hours.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, count]) => ({ label, count })),
    scrobblesByWeekday: [...weekdays.entries()].map(([label, count]) => ({ label, count })),
    scrobblesByMonthOfYear: MONTH_LABELS.map((label, index) => ({
      label,
      count: monthsOfYear.get(index) ?? 0,
    })),
    scrobblesByYear: historyStart
      ? fillYearlyBuckets(years, historyStart)
      : [...years.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([label, count]) => ({ label, count })),
    playHistory: [...playHistory.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, count]) => ({ label: formatMonthKeyShort(label), count })),
    playHistoryTimeline: buildPlayHistoryTimeline(playHistory, historyStart),
    ...(kind === "album" ? { uniqueTracks: uniqueTracks.size } : {}),
    ...(kind === "artist"
      ? { uniqueAlbums: uniqueAlbums.size, uniqueTracks: uniqueTracks.size }
      : {}),
  };
};

const buildPlayHistoryTimeline = (
  playHistory: Map<string, number>,
  timelineStart?: number,
): PlayHistoryPoint[] => {
  if (timelineStart === undefined) {
    return [];
  }

  return monthRangeKeys(timelineStart).map((key) => ({
    key,
    label: formatMonthKeyShort(key),
    tooltipLabel: formatMonthKeyLong(key),
    count: playHistory.get(key) ?? 0,
  }));
};
