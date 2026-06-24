import {
  createEmptyAdvancedListeningAnalytics,
  deriveAdvancedListeningAnalytics,
  type AdvancedListeningAnalytics,
} from "@/lib/advanced-listening-analytics";
import type { TopAlbum, TopArtist, TopTrack } from "@/lib/lastfm";
import type { CachedRecentTrack, LastFmPeriod, RankedStat } from "@/lib/lastfm-stats-cache";
import {
  resolveSessionGapSeconds,
  sortTracksChronologically,
  splitListeningSessions,
} from "@/lib/listening-sessions";
import {
  formatMonthKeyAnalytics,
  monthKeyFromTimestamp,
  monthRangeKeys,
  resolveTimelineStart,
} from "@/utils/account-timeline";

export type TopShare = {
  limit: number;
  share: number;
};

export type ConcentrationPoint = {
  index: number;
  share: number;
};

export type ListeningConcentrationStats = {
  artistTopShares: TopShare[];
  artistsFor50Percent: number;
  artistsFor80Percent: number;
  artistGini: number;
  artistCurve: ConcentrationPoint[];
};

export type DiscoveryReplayMonth = {
  label: string;
  newPlays: number;
  repeatPlays: number;
  heavyRepeatPlays: number;
  total: number;
};

export type DiscoveryReplayStats = {
  months: DiscoveryReplayMonth[];
  newPlays: number;
  repeatPlays: number;
  heavyRepeatPlays: number;
  discoveryRate: number;
};

export type LibraryGrowthMonth = {
  label: string;
  artists: number;
  albums: number;
  tracks: number;
  newArtists: number;
  newAlbums: number;
  newTracks: number;
};

export type LibraryGrowthStats = {
  months: LibraryGrowthMonth[];
  growth30Days: number;
  growth90Days: number;
  growth365Days: number;
};

export type RankMovementItem = {
  id: string;
  label: string;
  detail?: string;
  overallRank?: number;
  periodRank?: number;
  delta?: number;
  status: "riser" | "faller" | "new" | "stable";
};

export type RankMovementStats = {
  period: Exclude<LastFmPeriod, "overall">;
  risers: RankMovementItem[];
  fallers: RankMovementItem[];
  newEntrants: RankMovementItem[];
  stable: RankMovementItem[];
  artistBump: Array<{
    id: string;
    label: string;
    ranks: Partial<Record<LastFmPeriod, number>>;
  }>;
};

export type SessionMonth = {
  label: string;
  count: number;
};

export type SessionBucket = {
  label: string;
  count: number;
};

export type ListeningSessionStats = {
  totalSessions: number;
  gapSeconds: number;
  averageDurationMinutes: number;
  medianDurationMinutes: number;
  averageTracks: number;
  medianTracks: number;
  longestDurationMinutes: number;
  averageArtists: number;
  averageFocus: number;
  months: SessionMonth[];
  durationBuckets: SessionBucket[];
};

export type OverlapList = {
  overlapCount: number;
  jaccard: number;
  recentOnly: RankedStat[];
  historicalOnly: RankedStat[];
};

export type CurrentHistoricalOverlapStats = {
  currentWindowDays: number;
  artist: OverlapList;
  album: OverlapList;
  track: OverlapList;
  recentShareFromAllTimeTopArtists: number;
};

export type SeriousListeningAnalytics = {
  concentration: ListeningConcentrationStats;
  discoveryReplay: DiscoveryReplayStats;
  libraryGrowth: LibraryGrowthStats;
  rankMovement: RankMovementStats;
  sessions: ListeningSessionStats;
  overlap: CurrentHistoricalOverlapStats;
  advanced: AdvancedListeningAnalytics;
};

type PeriodLists = {
  topAlbums: Record<LastFmPeriod, TopAlbum[]>;
  topArtists: Record<LastFmPeriod, TopArtist[]>;
  topTracks: Record<LastFmPeriod, TopTrack[]>;
};

type ListeningAnalyticsOptions = {
  registeredAt?: number;
};

type RankedEntry = {
  key: string;
  label: string;
  detail?: string;
  count: number;
};

const TOP_SHARE_LIMITS = [5, 10, 25, 50];
const CURRENT_WINDOW_DAYS = 30;
const PERIODS: LastFmPeriod[] = ["overall", "7day", "1month", "3month", "6month", "12month"];

export const createEmptyListeningAnalytics = (): SeriousListeningAnalytics => ({
  concentration: {
    artistTopShares: TOP_SHARE_LIMITS.map((limit) => ({ limit, share: 0 })),
    artistsFor50Percent: 0,
    artistsFor80Percent: 0,
    artistGini: 0,
    artistCurve: [],
  },
  discoveryReplay: {
    months: [],
    newPlays: 0,
    repeatPlays: 0,
    heavyRepeatPlays: 0,
    discoveryRate: 0,
  },
  libraryGrowth: {
    months: [],
    growth30Days: 0,
    growth90Days: 0,
    growth365Days: 0,
  },
  rankMovement: {
    period: "1month",
    risers: [],
    fallers: [],
    newEntrants: [],
    stable: [],
    artistBump: [],
  },
  sessions: {
    totalSessions: 0,
    gapSeconds: 0,
    averageDurationMinutes: 0,
    medianDurationMinutes: 0,
    averageTracks: 0,
    medianTracks: 0,
    longestDurationMinutes: 0,
    averageArtists: 0,
    averageFocus: 0,
    months: [],
    durationBuckets: [],
  },
  overlap: {
    currentWindowDays: CURRENT_WINDOW_DAYS,
    artist: createEmptyOverlapList(),
    album: createEmptyOverlapList(),
    track: createEmptyOverlapList(),
    recentShareFromAllTimeTopArtists: 0,
  },
  advanced: createEmptyAdvancedListeningAnalytics(),
});

export const deriveListeningAnalytics = (
  recentTracks: CachedRecentTrack[],
  periodLists: PeriodLists,
  options?: ListeningAnalyticsOptions,
): SeriousListeningAnalytics => {
  if (recentTracks.length === 0) {
    return {
      ...createEmptyListeningAnalytics(),
      rankMovement: deriveRankMovement(periodLists),
    };
  }

  const chronological = sortTracksChronologically(recentTracks);
  const latestTimestamp = chronological.at(-1)?.playedAtTimestamp ?? 0;
  const currentFrom = latestTimestamp - CURRENT_WINDOW_DAYS * 86_400;
  const timelineStart = resolveTimelineStart(
    options?.registeredAt,
    chronological[0]?.playedAtTimestamp,
  );

  return {
    concentration: deriveConcentration(chronological),
    discoveryReplay: deriveDiscoveryReplay(chronological, timelineStart),
    libraryGrowth: deriveLibraryGrowth(chronological, latestTimestamp, timelineStart),
    rankMovement: deriveRankMovement(periodLists),
    sessions: deriveSessions(chronological, timelineStart),
    overlap: deriveOverlap(chronological, currentFrom),
    advanced: deriveAdvancedListeningAnalytics(chronological, timelineStart),
  };
};

const deriveConcentration = (tracks: CachedRecentTrack[]): ListeningConcentrationStats => {
  const artistCounts = countEntries(tracks, artistEntry);
  const counts = artistCounts.map((entry) => entry.count).sort((left, right) => right - left);
  const total = counts.reduce((sum, count) => sum + count, 0);

  return {
    artistTopShares: TOP_SHARE_LIMITS.map((limit) => ({
      limit,
      share: total > 0 ? counts.slice(0, limit).reduce((sum, count) => sum + count, 0) / total : 0,
    })),
    artistsFor50Percent: countToShare(counts, total, 0.5),
    artistsFor80Percent: countToShare(counts, total, 0.8),
    artistGini: calculateGini(counts),
    artistCurve: buildConcentrationCurve(counts, total),
  };
};

const deriveDiscoveryReplay = (
  tracks: CachedRecentTrack[],
  timelineStart?: number,
): DiscoveryReplayStats => {
  const seen = new Map<string, number>();
  const months = new Map<
    string,
    Pick<DiscoveryReplayMonth, "newPlays" | "repeatPlays" | "heavyRepeatPlays" | "total">
  >();
  let newPlays = 0;
  let repeatPlays = 0;
  let heavyRepeatPlays = 0;

  for (const track of tracks) {
    const key = trackKey(track);
    const seenCount = seen.get(key) ?? 0;
    const month = getOrCreateDiscoveryMonth(months, monthKeyFromTimestamp(track.playedAtTimestamp));

    if (seenCount === 0) {
      month.newPlays += 1;
      newPlays += 1;
    } else if (seenCount < 9) {
      month.repeatPlays += 1;
      repeatPlays += 1;
    } else {
      month.heavyRepeatPlays += 1;
      heavyRepeatPlays += 1;
    }

    month.total += 1;
    seen.set(key, seenCount + 1);
  }

  const total = newPlays + repeatPlays + heavyRepeatPlays;

  return {
    months: timelineStart
      ? fillDiscoveryReplayMonths(months, timelineStart)
      : toDiscoveryReplayMonths(months),
    newPlays,
    repeatPlays,
    heavyRepeatPlays,
    discoveryRate: total > 0 ? newPlays / total : 0,
  };
};

const deriveLibraryGrowth = (
  tracks: CachedRecentTrack[],
  latestTimestamp: number,
  timelineStart?: number,
): LibraryGrowthStats => {
  const artists = new Set<string>();
  const albums = new Set<string>();
  const trackKeys = new Set<string>();
  const months = new Map<
    string,
    Pick<
      LibraryGrowthMonth,
      "artists" | "albums" | "tracks" | "newArtists" | "newAlbums" | "newTracks"
    >
  >();
  let growth30Days = 0;
  let growth90Days = 0;
  let growth365Days = 0;

  for (const track of tracks) {
    const monthKey = monthKeyFromTimestamp(track.playedAtTimestamp);
    const month = getOrCreateGrowthMonth(months, monthKey);
    const newItems = [
      addUnique(artists, artistKey(track)),
      track.albumName ? addUnique(albums, albumKey(track)) : false,
      addUnique(trackKeys, trackKey(track)),
    ];

    if (newItems[0]) month.newArtists += 1;
    if (newItems[1]) month.newAlbums += 1;
    if (newItems[2]) month.newTracks += 1;

    month.artists = artists.size;
    month.albums = albums.size;
    month.tracks = trackKeys.size;

    if (newItems.some(Boolean)) {
      const ageDays = (latestTimestamp - track.playedAtTimestamp) / 86_400;

      if (ageDays <= 30) growth30Days += countTrue(newItems);
      if (ageDays <= 90) growth90Days += countTrue(newItems);
      if (ageDays <= 365) growth365Days += countTrue(newItems);
    }
  }

  return {
    months: timelineStart
      ? fillLibraryGrowthMonths(months, timelineStart)
      : toLibraryGrowthMonths(months),
    growth30Days,
    growth90Days,
    growth365Days,
  };
};

const deriveRankMovement = (periodLists: PeriodLists): RankMovementStats => {
  const period = pickMovementPeriod(periodLists.topArtists);
  const movement = buildRankMovement(
    periodLists.topArtists.overall,
    periodLists.topArtists[period],
    (artist) => artistKeyFromName(artist.name),
    (artist) => ({ label: artist.name }),
  );

  return {
    period,
    risers: movement.filter((item) => item.status === "riser").slice(0, 5),
    fallers: movement.filter((item) => item.status === "faller").slice(0, 5),
    newEntrants: movement.filter((item) => item.status === "new").slice(0, 5),
    stable: movement.filter((item) => item.status === "stable").slice(0, 5),
    artistBump: buildArtistBump(periodLists.topArtists),
  };
};

const deriveSessions = (
  tracks: CachedRecentTrack[],
  timelineStart?: number,
): ListeningSessionStats => {
  const gapSeconds = resolveSessionGapSeconds(tracks);
  const sessions = splitListeningSessions(tracks, gapSeconds);

  const durations = sessions.map(sessionDurationMinutes);
  const trackCounts = sessions.map((session) => session.length);
  const artistCounts = sessions.map((session) => new Set(session.map(artistKey)).size);
  const focusScores = sessions.map(sessionFocus);
  const months = new Map<string, number>();

  for (const session of sessions) {
    const timestamp = session[0]?.playedAtTimestamp ?? 0;

    if (timestamp <= 0) continue;

    const monthKey = monthKeyFromTimestamp(timestamp);
    months.set(monthKey, (months.get(monthKey) ?? 0) + 1);
  }

  return {
    totalSessions: sessions.length,
    gapSeconds,
    averageDurationMinutes: average(durations),
    medianDurationMinutes: median(durations),
    averageTracks: average(trackCounts),
    medianTracks: median(trackCounts),
    longestDurationMinutes: Math.max(0, ...durations),
    averageArtists: average(artistCounts),
    averageFocus: average(focusScores),
    months: timelineStart
      ? monthRangeKeys(timelineStart).map((key) => ({
          label: formatMonthKeyAnalytics(key),
          count: months.get(key) ?? 0,
        }))
      : [...months.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, count]) => ({ label: formatMonthKeyAnalytics(key), count })),
    durationBuckets: buildDurationBuckets(durations),
  };
};

const deriveOverlap = (
  tracks: CachedRecentTrack[],
  currentFrom: number,
): CurrentHistoricalOverlapStats => {
  const recent = tracks.filter((track) => track.playedAtTimestamp >= currentFrom);
  const historicalArtists = topRanked(countEntries(tracks, artistEntry), 50);
  const recentArtists = topRanked(countEntries(recent, artistEntry), 50);
  const historicalArtistKeys = new Set(historicalArtists.map((item) => item.id));
  const recentArtistTopPlays = recent.filter((track) =>
    historicalArtistKeys.has(artistKey(track)),
  ).length;

  return {
    currentWindowDays: CURRENT_WINDOW_DAYS,
    artist: compareRankedLists(recentArtists, historicalArtists),
    album: compareRankedLists(
      topRanked(countEntries(recent, albumEntry), 50),
      topRanked(countEntries(tracks, albumEntry), 50),
    ),
    track: compareRankedLists(
      topRanked(countEntries(recent, trackEntry), 50),
      topRanked(countEntries(tracks, trackEntry), 50),
    ),
    recentShareFromAllTimeTopArtists: recent.length > 0 ? recentArtistTopPlays / recent.length : 0,
  };
};

const countEntries = (
  tracks: CachedRecentTrack[],
  mapTrack: (track: CachedRecentTrack) => RankedEntry | undefined,
) => {
  const stats = new Map<string, RankedEntry>();

  for (const track of tracks) {
    const entry = mapTrack(track);

    if (!entry) continue;

    const current = stats.get(entry.key);

    if (current) {
      current.count += 1;
    } else {
      stats.set(entry.key, { ...entry });
    }
  }

  return [...stats.values()];
};

const topRanked = (entries: RankedEntry[], limit: number): RankedStat[] =>
  entries
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
    .map((entry) => ({
      id: entry.key,
      label: entry.label,
      detail: entry.detail,
      count: entry.count,
    }));

const compareRankedLists = (recent: RankedStat[], historical: RankedStat[]): OverlapList => {
  const recentKeys = new Set(recent.map((item) => item.id));
  const historicalKeys = new Set(historical.map((item) => item.id));
  const overlapCount = recent.filter((item) => historicalKeys.has(item.id)).length;
  const union = new Set([...recentKeys, ...historicalKeys]).size;

  return {
    overlapCount,
    jaccard: union > 0 ? overlapCount / union : 0,
    recentOnly: recent.filter((item) => !historicalKeys.has(item.id)).slice(0, 5),
    historicalOnly: historical.filter((item) => !recentKeys.has(item.id)).slice(0, 5),
  };
};

const createEmptyOverlapList = (): OverlapList => ({
  overlapCount: 0,
  jaccard: 0,
  recentOnly: [],
  historicalOnly: [],
});

const countToShare = (counts: number[], total: number, targetShare: number) => {
  if (total === 0) return 0;

  let cumulative = 0;

  for (let index = 0; index < counts.length; index += 1) {
    cumulative += counts[index] ?? 0;

    if (cumulative / total >= targetShare) return index + 1;
  }

  return counts.length;
};

const calculateGini = (counts: number[]) => {
  if (counts.length === 0) return 0;

  const ascending = [...counts].sort((left, right) => left - right);
  const total = ascending.reduce((sum, count) => sum + count, 0);

  if (total === 0) return 0;

  const weighted = ascending.reduce((sum, count, index) => sum + (index + 1) * count, 0);

  return (2 * weighted) / (ascending.length * total) - (ascending.length + 1) / ascending.length;
};

const buildConcentrationCurve = (counts: number[], total: number) => {
  if (total === 0) return [];

  let cumulative = 0;

  return counts.map((count, index) => {
    cumulative += count;

    return {
      index: index + 1,
      share: cumulative / total,
    };
  });
};

const getOrCreateDiscoveryMonth = (
  months: Map<
    string,
    Pick<DiscoveryReplayMonth, "newPlays" | "repeatPlays" | "heavyRepeatPlays" | "total">
  >,
  key: string,
) => {
  const current = months.get(key);

  if (current) return current;

  const month = { newPlays: 0, repeatPlays: 0, heavyRepeatPlays: 0, total: 0 };

  months.set(key, month);
  return month;
};

const getOrCreateGrowthMonth = (
  months: Map<
    string,
    Pick<
      LibraryGrowthMonth,
      "artists" | "albums" | "tracks" | "newArtists" | "newAlbums" | "newTracks"
    >
  >,
  key: string,
) => {
  const current = months.get(key);

  if (current) return current;

  const previous = [...months.values()].at(-1);
  const month = {
    artists: previous?.artists ?? 0,
    albums: previous?.albums ?? 0,
    tracks: previous?.tracks ?? 0,
    newArtists: 0,
    newAlbums: 0,
    newTracks: 0,
  };

  months.set(key, month);
  return month;
};

const fillDiscoveryReplayMonths = (
  months: Map<
    string,
    Pick<DiscoveryReplayMonth, "newPlays" | "repeatPlays" | "heavyRepeatPlays" | "total">
  >,
  timelineStart: number,
): DiscoveryReplayMonth[] =>
  monthRangeKeys(timelineStart).map((key) => {
    const month = months.get(key);

    return {
      label: formatMonthKeyAnalytics(key),
      newPlays: month?.newPlays ?? 0,
      repeatPlays: month?.repeatPlays ?? 0,
      heavyRepeatPlays: month?.heavyRepeatPlays ?? 0,
      total: month?.total ?? 0,
    };
  });

const toDiscoveryReplayMonths = (
  months: Map<
    string,
    Pick<DiscoveryReplayMonth, "newPlays" | "repeatPlays" | "heavyRepeatPlays" | "total">
  >,
): DiscoveryReplayMonth[] =>
  [...months.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, month]) => ({
      label: formatMonthKeyAnalytics(key),
      ...month,
    }));

const fillLibraryGrowthMonths = (
  months: Map<
    string,
    Pick<
      LibraryGrowthMonth,
      "artists" | "albums" | "tracks" | "newArtists" | "newAlbums" | "newTracks"
    >
  >,
  timelineStart: number,
): LibraryGrowthMonth[] => {
  let artists = 0;
  let albums = 0;
  let tracks = 0;

  return monthRangeKeys(timelineStart).map((key) => {
    const month = months.get(key);

    if (month) {
      artists = month.artists;
      albums = month.albums;
      tracks = month.tracks;

      return {
        label: formatMonthKeyAnalytics(key),
        artists,
        albums,
        tracks,
        newArtists: month.newArtists,
        newAlbums: month.newAlbums,
        newTracks: month.newTracks,
      };
    }

    return {
      label: formatMonthKeyAnalytics(key),
      artists,
      albums,
      tracks,
      newArtists: 0,
      newAlbums: 0,
      newTracks: 0,
    };
  });
};

const toLibraryGrowthMonths = (
  months: Map<
    string,
    Pick<
      LibraryGrowthMonth,
      "artists" | "albums" | "tracks" | "newArtists" | "newAlbums" | "newTracks"
    >
  >,
): LibraryGrowthMonth[] =>
  [...months.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, month]) => ({
      label: formatMonthKeyAnalytics(key),
      ...month,
    }));

const pickMovementPeriod = (
  artists: Record<LastFmPeriod, TopArtist[]>,
): Exclude<LastFmPeriod, "overall"> =>
  PERIODS.filter((period): period is Exclude<LastFmPeriod, "overall"> => period !== "overall").find(
    (period) => artists[period].length > 0,
  ) ?? "1month";

const buildRankMovement = <TItem extends { rank?: number }>(
  overall: TItem[],
  period: TItem[],
  getKey: (item: TItem) => string,
  getLabel: (item: TItem) => { label: string; detail?: string },
) => {
  const overallRanks = new Map(overall.map((item) => [getKey(item), item.rank]));

  return period
    .map<RankMovementItem>((item) => {
      const key = getKey(item);
      const overallRank = overallRanks.get(key);
      const periodRank = item.rank;
      const delta =
        overallRank !== undefined && periodRank !== undefined
          ? overallRank - periodRank
          : undefined;
      const status =
        overallRank === undefined
          ? "new"
          : Math.abs(delta ?? 0) <= 2
            ? "stable"
            : (delta ?? 0) > 0
              ? "riser"
              : "faller";

      return {
        id: key,
        ...getLabel(item),
        overallRank,
        periodRank,
        delta,
        status,
      };
    })
    .sort((left, right) => Math.abs(right.delta ?? 999) - Math.abs(left.delta ?? 999));
};

const buildArtistBump = (artists: Record<LastFmPeriod, TopArtist[]>) => {
  const keys = new Map<string, { label: string; ranks: Partial<Record<LastFmPeriod, number>> }>();

  for (const period of PERIODS) {
    for (const artist of artists[period].slice(0, 10)) {
      const key = artistKeyFromName(artist.name);
      const current = keys.get(key) ?? { label: artist.name, ranks: {} };

      current.ranks[period] = artist.rank;
      keys.set(key, current);
    }
  }

  return [...keys.entries()].slice(0, 8).map(([id, item]) => ({ id, ...item }));
};

const sessionDurationMinutes = (session: CachedRecentTrack[]) => {
  const first = session[0]?.playedAtTimestamp ?? 0;
  const last = session.at(-1)?.playedAtTimestamp ?? first;

  return Math.round((last - first) / 60);
};

const sessionFocus = (session: CachedRecentTrack[]) => {
  const counts = countEntries(session, artistEntry);
  const top = Math.max(0, ...counts.map((entry) => entry.count));

  return session.length > 0 ? top / session.length : 0;
};

const buildDurationBuckets = (durations: number[]): SessionBucket[] => {
  const buckets = [
    { label: "<15m", max: 14, count: 0 },
    { label: "15-29m", max: 29, count: 0 },
    { label: "30-59m", max: 59, count: 0 },
    { label: "1-2h", max: 119, count: 0 },
    { label: "2h+", max: Number.POSITIVE_INFINITY, count: 0 },
  ];

  for (const duration of durations) {
    const bucket = buckets.find((item) => duration <= item.max);

    if (bucket) bucket.count += 1;
  }

  return buckets.map(({ label, count }) => ({ label, count }));
};

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const median = (values: number[]) => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};

const addUnique = (set: Set<string>, key: string) => {
  if (set.has(key)) return false;

  set.add(key);
  return true;
};

const countTrue = (values: boolean[]) => values.filter(Boolean).length;

const normalizeKeyPart = (value: string | undefined) => value?.trim().toLocaleLowerCase() ?? "";

const artistKeyFromName = (name: string) => normalizeKeyPart(name);

const artistKey = (track: CachedRecentTrack) => artistKeyFromName(track.artistName);

const albumKey = (track: CachedRecentTrack) =>
  `${artistKey(track)}:${normalizeKeyPart(track.albumName)}`;

const trackKey = (track: CachedRecentTrack) =>
  `${artistKey(track)}:${normalizeKeyPart(track.trackName)}`;

const artistEntry = (track: CachedRecentTrack): RankedEntry => ({
  key: artistKey(track),
  label: track.artistName,
  count: 1,
});

const albumEntry = (track: CachedRecentTrack): RankedEntry | undefined =>
  track.albumName
    ? {
        key: albumKey(track),
        label: track.albumName,
        detail: track.artistName,
        count: 1,
      }
    : undefined;

const trackEntry = (track: CachedRecentTrack): RankedEntry => ({
  key: trackKey(track),
  label: track.trackName,
  detail: track.artistName,
  count: 1,
});

export const albumMovementLabel = (album: TopAlbum) => ({
  label: album.name,
  detail: album.artist.name,
});

export const trackMovementLabel = (track: TopTrack) => ({
  label: track.name,
  detail: track.artist.name,
});
