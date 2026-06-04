import { createCollection, localOnlyCollectionOptions } from "@tanstack/react-db";
import Dexie, { type Table } from "dexie";

import type { Friend, RecentTrack, TopAlbum, TopArtist, TopTrack, UserInfo } from "@/lib/lastfm";
import type { DerivedRecentTrack } from "@/lib/lastfm-derived-stats";
import { deriveLastFmStatsAsync } from "@/lib/lastfm-derived-stats-worker-client";
import {
  createEmptyListeningAnalytics,
  type SeriousListeningAnalytics,
} from "@/lib/listening-analytics";

export const LASTFM_PERIODS = ["overall", "7day", "1month", "3month", "6month", "12month"] as const;
const SNAPSHOT_TOP_RANKING_LIMIT = 200;

export type LastFmPeriod = (typeof LASTFM_PERIODS)[number];

export type EndpointCounts = Record<LastFmPeriod, number>;

export type LastFmStatsCounts = {
  friends: number;
  recentTracks: number;
  topAlbums: EndpointCounts;
  topArtists: EndpointCounts;
  topTracks: EndpointCounts;
};

export type LastFmSyncStatus = "idle" | "running" | "complete" | "stopped" | "error";

export type LastFmSyncPhase =
  | "idle"
  | "profile"
  | "friends"
  | "top-artists"
  | "top-albums"
  | "top-tracks"
  | "recent-tracks"
  | "snapshot"
  | "complete";

export type LastFmSyncMeta = {
  usernameLower: string;
  username: string;
  status: LastFmSyncStatus;
  phase: LastFmSyncPhase;
  message: string;
  fetched: number;
  total?: number;
  updatedAt: string;
  completedAt?: string;
  error?: string;
};

export type CachedProfile = {
  usernameLower: string;
  username: string;
  fetchedAt: string;
  info: UserInfo;
};

export type CachedFriend = {
  id: string;
  usernameLower: string;
  friendNameLower: string;
  fetchedAt: string;
  friend: Friend;
};

export type CachedTopArtist = {
  id: string;
  usernameLower: string;
  period: LastFmPeriod;
  rank: number;
  playcount: number;
  fetchedAt: string;
  artist: TopArtist;
};

export type CachedTopAlbum = {
  id: string;
  usernameLower: string;
  period: LastFmPeriod;
  rank: number;
  playcount: number;
  fetchedAt: string;
  album: TopAlbum;
};

export type CachedTopTrack = {
  id: string;
  usernameLower: string;
  period: LastFmPeriod;
  rank: number;
  playcount: number;
  fetchedAt: string;
  track: TopTrack;
};

export type CachedRecentTrack = {
  id: string;
  usernameLower: string;
  playedAtTimestamp: number;
  playedAtLabel?: string;
  artistName: string;
  albumName?: string;
  trackName: string;
  loved: boolean;
  fetchedAt: string;
  track: RecentTrack;
};

export type RankedStat = {
  id: string;
  label: string;
  detail?: string;
  count: number;
  imageUrl?: string;
  url?: string;
};

export type TimeBucket = {
  label: string;
  count: number;
};

export type LastFmDerivedStats = {
  analytics: SeriousListeningAnalytics;
  firstScrobble?: CachedRecentTrack;
  lastScrobble?: CachedRecentTrack;
  lovedTracks: number;
  scrobbleCoverage: number;
  uniqueAlbums: number;
  uniqueArtists: number;
  uniqueTracks: number;
  topAlbumsFromHistory: RankedStat[];
  topArtistsFromHistory: RankedStat[];
  topTracksFromHistory: RankedStat[];
  scrobblesByYear: TimeBucket[];
  scrobblesByHour: TimeBucket[];
  scrobblesByWeekday: TimeBucket[];
  scrobblesByMonthOfYear: TimeBucket[];
};

export type PeriodLeaders = Record<
  LastFmPeriod,
  {
    artist?: TopArtist;
    album?: TopAlbum;
    track?: TopTrack;
  }
>;

export type LastFmStatsSnapshot = {
  id: string;
  usernameLower: string;
  username: string;
  updatedAt: string;
  profile?: UserInfo;
  sync?: LastFmSyncMeta;
  counts: LastFmStatsCounts;
  derived: LastFmDerivedStats;
  periodLeaders: PeriodLeaders;
  friends: Friend[];
  recentTracks: CachedRecentTrack[];
  topAlbums: Record<LastFmPeriod, TopAlbum[]>;
  topArtists: Record<LastFmPeriod, TopArtist[]>;
  topTracks: Record<LastFmPeriod, TopTrack[]>;
};

class LastFmStatsDatabase extends Dexie {
  friends!: Table<CachedFriend, string>;
  profiles!: Table<CachedProfile, string>;
  recentTracks!: Table<CachedRecentTrack, string>;
  syncMeta!: Table<LastFmSyncMeta, string>;
  topAlbums!: Table<CachedTopAlbum, string>;
  topArtists!: Table<CachedTopArtist, string>;
  topTracks!: Table<CachedTopTrack, string>;

  constructor() {
    super("scrobbling-away-lastfm");

    this.version(1).stores({
      friends: "&id, usernameLower, friendNameLower",
      profiles: "&usernameLower, username, fetchedAt",
      recentTracks:
        "&id, usernameLower, playedAtTimestamp, [usernameLower+playedAtTimestamp], artistName, albumName, trackName, loved",
      syncMeta: "&usernameLower, status, phase, updatedAt",
      topAlbums: "&id, [usernameLower+period], usernameLower, period, rank, playcount",
      topArtists: "&id, [usernameLower+period], usernameLower, period, rank, playcount",
      topTracks: "&id, [usernameLower+period], usernameLower, period, rank, playcount",
    });
  }
}

export const lastFmStatsDb = new LastFmStatsDatabase();

export const statsSnapshotsCollection = createCollection(
  localOnlyCollectionOptions<LastFmStatsSnapshot, string>({
    id: "lastfm-stats-snapshots",
    getKey: (snapshot) => snapshot.id,
  }),
);

export const normalizeUsername = (username: string) => username.trim().toLocaleLowerCase();

export const createEmptyEndpointCounts = (): EndpointCounts => ({
  "12month": 0,
  "1month": 0,
  "3month": 0,
  "6month": 0,
  "7day": 0,
  overall: 0,
});

export const createEmptyStatsCounts = (): LastFmStatsCounts => ({
  friends: 0,
  recentTracks: 0,
  topAlbums: createEmptyEndpointCounts(),
  topArtists: createEmptyEndpointCounts(),
  topTracks: createEmptyEndpointCounts(),
});

const createEmptyPeriodLeaders = (): PeriodLeaders => ({
  "12month": {},
  "1month": {},
  "3month": {},
  "6month": {},
  "7day": {},
  overall: {},
});

const createEmptyPeriodLists = <T>(): Record<LastFmPeriod, T[]> => ({
  "12month": [],
  "1month": [],
  "3month": [],
  "6month": [],
  "7day": [],
  overall: [],
});

export const createEmptyDerivedStats = (): LastFmDerivedStats => ({
  analytics: createEmptyListeningAnalytics(),
  lovedTracks: 0,
  scrobbleCoverage: 0,
  uniqueAlbums: 0,
  uniqueArtists: 0,
  uniqueTracks: 0,
  topAlbumsFromHistory: [],
  topArtistsFromHistory: [],
  topTracksFromHistory: [],
  scrobblesByHour: [],
  scrobblesByWeekday: [],
  scrobblesByMonthOfYear: [],
  scrobblesByYear: [],
});

export const createEmptyStatsSnapshot = (username: string): LastFmStatsSnapshot => {
  const usernameLower = normalizeUsername(username);

  return {
    id: usernameLower,
    username: username.trim(),
    usernameLower,
    updatedAt: new Date().toISOString(),
    counts: createEmptyStatsCounts(),
    derived: createEmptyDerivedStats(),
    friends: [],
    periodLeaders: createEmptyPeriodLeaders(),
    recentTracks: [],
    topAlbums: createEmptyPeriodLists<TopAlbum>(),
    topArtists: createEmptyPeriodLists<TopArtist>(),
    topTracks: createEmptyPeriodLists<TopTrack>(),
  };
};

export const getImageUrl = (
  images: Array<{ "#text": string; size: string }> | undefined,
  preferredSizes = ["extralarge", "large", "medium"],
) => {
  for (const size of preferredSizes) {
    const image = images?.find((entry) => entry.size === size && entry["#text"]);

    if (image) {
      return image["#text"];
    }
  }

  return images?.find((entry) => entry["#text"])?.["#text"];
};

const hashString = (input: string) => {
  let hash = 5381;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
};

const normalizeKeyPart = (value: string | undefined) => value?.trim().toLocaleLowerCase() ?? "";

export const readLastFmString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

export const readOptionalLastFmString = (value: unknown) => {
  const text = readLastFmString(value);

  return text ? text : undefined;
};

const periodItemId = (
  usernameLower: string,
  period: LastFmPeriod,
  rank: number | undefined,
  parts: string[],
) => `${usernameLower}:${period}:${rank ?? "unranked"}:${hashString(parts.join("|"))}`;

export const createCachedFriend = (
  usernameLower: string,
  friend: Friend,
  fetchedAt: string,
): CachedFriend => {
  const friendNameLower = normalizeUsername(friend.name);

  return {
    id: `${usernameLower}:${friendNameLower}`,
    usernameLower,
    friendNameLower,
    fetchedAt,
    friend,
  };
};

export const createCachedTopArtist = (
  usernameLower: string,
  period: LastFmPeriod,
  artist: TopArtist,
  fetchedAt: string,
): CachedTopArtist => ({
  id: periodItemId(usernameLower, period, artist.rank, [artist.name, artist.mbid ?? ""]),
  usernameLower,
  period,
  rank: artist.rank ?? 0,
  playcount: artist.playcount,
  fetchedAt,
  artist,
});

export const createCachedTopAlbum = (
  usernameLower: string,
  period: LastFmPeriod,
  album: TopAlbum,
  fetchedAt: string,
): CachedTopAlbum => ({
  id: periodItemId(usernameLower, period, album.rank, [
    readLastFmString(album.artist.name),
    album.name,
    album.mbid ?? "",
  ]),
  usernameLower,
  period,
  rank: album.rank ?? 0,
  playcount: album.playcount,
  fetchedAt,
  album,
});

export const createCachedTopTrack = (
  usernameLower: string,
  period: LastFmPeriod,
  track: TopTrack,
  fetchedAt: string,
): CachedTopTrack => ({
  id: periodItemId(usernameLower, period, track.rank, [
    readLastFmString(track.artist.name),
    track.name,
    track.mbid ?? "",
  ]),
  usernameLower,
  period,
  rank: track.rank ?? 0,
  playcount: track.playcount,
  fetchedAt,
  track,
});

export const createCachedRecentTrack = (
  usernameLower: string,
  track: RecentTrack,
  fetchedAt: string,
): CachedRecentTrack | undefined => {
  if (!track.playedAt) {
    return undefined;
  }

  const playedAtTimestamp = track.playedAt.timestamp;
  const artistName = readLastFmString(track.artist.name);
  const albumName = readOptionalLastFmString(track.album?.name);
  const trackName = track.name;
  const keyParts = [
    playedAtTimestamp.toString(),
    normalizeKeyPart(artistName),
    normalizeKeyPart(trackName),
    normalizeKeyPart(albumName),
    normalizeKeyPart(track.url),
  ];

  return {
    id: `${usernameLower}:${playedAtTimestamp}:${hashString(keyParts.join("|"))}`,
    usernameLower,
    playedAtTimestamp,
    playedAtLabel: track.playedAt.label,
    artistName,
    albumName,
    trackName,
    loved: track.loved ?? false,
    fetchedAt,
    track,
  };
};

const sortByRank = <T extends { rank?: number }>(items: T[]) =>
  [...items].sort(
    (left, right) =>
      (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER),
  );

const topRowsByPeriod = async <TRow extends { rank: number; period: LastFmPeriod }>(
  table: Table<TRow, string>,
  usernameLower: string,
  period: LastFmPeriod,
  limit: number,
) => {
  const rows = await table
    .where("[usernameLower+period]")
    .equals([usernameLower, period])
    .toArray();

  return rows.sort((left, right) => left.rank - right.rank).slice(0, limit);
};

const countRowsByPeriod = async <TRow>(
  table: Table<TRow, string>,
  usernameLower: string,
): Promise<EndpointCounts> => {
  const counts = createEmptyEndpointCounts();

  await Promise.all(
    LASTFM_PERIODS.map(async (period) => {
      counts[period] = await table
        .where("[usernameLower+period]")
        .equals([usernameLower, period])
        .count();
    }),
  );

  return counts;
};

export const clearCachedTopPeriod = async (usernameLower: string, period: LastFmPeriod) => {
  await Promise.all([
    lastFmStatsDb.topAlbums
      .where("[usernameLower+period]")
      .equals([usernameLower, period])
      .delete(),
    lastFmStatsDb.topArtists
      .where("[usernameLower+period]")
      .equals([usernameLower, period])
      .delete(),
    lastFmStatsDb.topTracks
      .where("[usernameLower+period]")
      .equals([usernameLower, period])
      .delete(),
  ]);
};

export const markAbandonedSyncStopped = async (username: string) => {
  const usernameLower = normalizeUsername(username);
  const sync = await lastFmStatsDb.syncMeta.get(usernameLower);

  if (!sync || sync.status !== "running") {
    return;
  }

  const stoppedSync: LastFmSyncMeta = {
    ...sync,
    status: "stopped",
    message: "Previous sync was interrupted. Cached data is still available.",
    updatedAt: new Date().toISOString(),
  };

  await lastFmStatsDb.syncMeta.put(stoppedSync);
};

export const clearCachedStatsForUser = async (username: string) => {
  const usernameLower = normalizeUsername(username);

  await lastFmStatsDb.transaction(
    "rw",
    [
      lastFmStatsDb.friends,
      lastFmStatsDb.profiles,
      lastFmStatsDb.recentTracks,
      lastFmStatsDb.syncMeta,
      lastFmStatsDb.topAlbums,
      lastFmStatsDb.topArtists,
      lastFmStatsDb.topTracks,
    ],
    async () => {
      await Promise.all([
        lastFmStatsDb.friends.where("usernameLower").equals(usernameLower).delete(),
        lastFmStatsDb.profiles.delete(usernameLower),
        lastFmStatsDb.recentTracks.where("usernameLower").equals(usernameLower).delete(),
        lastFmStatsDb.syncMeta.delete(usernameLower),
        lastFmStatsDb.topAlbums.where("usernameLower").equals(usernameLower).delete(),
        lastFmStatsDb.topArtists.where("usernameLower").equals(usernameLower).delete(),
        lastFmStatsDb.topTracks.where("usernameLower").equals(usernameLower).delete(),
      ]);
    },
  );

  await statsSnapshotsCollection.preload();

  if (statsSnapshotsCollection.has(usernameLower)) {
    const transaction = statsSnapshotsCollection.delete(usernameLower);
    await transaction.isPersisted.promise;
  }
};

export const replaceCachedFriends = async (usernameLower: string, friends: CachedFriend[]) => {
  await lastFmStatsDb.transaction("rw", lastFmStatsDb.friends, async () => {
    await lastFmStatsDb.friends.where("usernameLower").equals(usernameLower).delete();

    if (friends.length > 0) {
      await lastFmStatsDb.friends.bulkPut(friends);
    }
  });
};

export const replaceCachedTopArtists = async (
  usernameLower: string,
  period: LastFmPeriod,
  artists: CachedTopArtist[],
) => {
  await lastFmStatsDb.transaction("rw", lastFmStatsDb.topArtists, async () => {
    await lastFmStatsDb.topArtists
      .where("[usernameLower+period]")
      .equals([usernameLower, period])
      .delete();

    if (artists.length > 0) {
      await lastFmStatsDb.topArtists.bulkPut(artists);
    }
  });
};

export const replaceCachedTopAlbums = async (
  usernameLower: string,
  period: LastFmPeriod,
  albums: CachedTopAlbum[],
) => {
  await lastFmStatsDb.transaction("rw", lastFmStatsDb.topAlbums, async () => {
    await lastFmStatsDb.topAlbums
      .where("[usernameLower+period]")
      .equals([usernameLower, period])
      .delete();

    if (albums.length > 0) {
      await lastFmStatsDb.topAlbums.bulkPut(albums);
    }
  });
};

export const replaceCachedTopTracks = async (
  usernameLower: string,
  period: LastFmPeriod,
  tracks: CachedTopTrack[],
) => {
  await lastFmStatsDb.transaction("rw", lastFmStatsDb.topTracks, async () => {
    await lastFmStatsDb.topTracks
      .where("[usernameLower+period]")
      .equals([usernameLower, period])
      .delete();

    if (tracks.length > 0) {
      await lastFmStatsDb.topTracks.bulkPut(tracks);
    }
  });
};

export const publishStatsSnapshot = async (snapshot: LastFmStatsSnapshot) => {
  await statsSnapshotsCollection.preload();

  if (statsSnapshotsCollection.has(snapshot.id)) {
    const transaction = statsSnapshotsCollection.update(snapshot.id, (draft) => {
      Object.assign(draft, snapshot);
    });

    await transaction.isPersisted.promise;
    return;
  }

  const transaction = statsSnapshotsCollection.insert(snapshot);
  await transaction.isPersisted.promise;
};

export const patchStatsSnapshot = async (
  username: string,
  patch: Partial<Omit<LastFmStatsSnapshot, "id" | "usernameLower">>,
) => {
  const usernameLower = normalizeUsername(username);

  await statsSnapshotsCollection.preload();

  if (!statsSnapshotsCollection.has(usernameLower)) {
    const transaction = statsSnapshotsCollection.insert({
      ...createEmptyStatsSnapshot(username),
      ...patch,
      id: usernameLower,
      usernameLower,
    });

    await transaction.isPersisted.promise;
    return;
  }

  const transaction = statsSnapshotsCollection.update(usernameLower, (draft) => {
    Object.assign(draft, patch);
    draft.updatedAt = patch.updatedAt ?? new Date().toISOString();
  });

  await transaction.isPersisted.promise;
};

export const buildStatsSnapshot = async (username: string): Promise<LastFmStatsSnapshot> => {
  const usernameLower = normalizeUsername(username);
  const [profile, sync, friends, recentTracks, topArtistCounts, topAlbumCounts, topTrackCounts] =
    await Promise.all([
      lastFmStatsDb.profiles.get(usernameLower),
      lastFmStatsDb.syncMeta.get(usernameLower),
      lastFmStatsDb.friends.where("usernameLower").equals(usernameLower).limit(24).toArray(),
      lastFmStatsDb.recentTracks
        .where("[usernameLower+playedAtTimestamp]")
        .between([usernameLower, Dexie.minKey], [usernameLower, Dexie.maxKey])
        .reverse()
        .limit(60)
        .toArray(),
      countRowsByPeriod(lastFmStatsDb.topArtists, usernameLower),
      countRowsByPeriod(lastFmStatsDb.topAlbums, usernameLower),
      countRowsByPeriod(lastFmStatsDb.topTracks, usernameLower),
    ]);
  const recentTrackCount = await lastFmStatsDb.recentTracks
    .where("usernameLower")
    .equals(usernameLower)
    .count();
  const allRecentTracks = await lastFmStatsDb.recentTracks
    .where("usernameLower")
    .equals(usernameLower)
    .toArray();
  const topArtists = createEmptyPeriodLists<TopArtist>();
  const topAlbums = createEmptyPeriodLists<TopAlbum>();
  const topTracks = createEmptyPeriodLists<TopTrack>();
  const periodLeaders = createEmptyPeriodLeaders();

  await Promise.all(
    LASTFM_PERIODS.flatMap((period) => [
      topRowsByPeriod(
        lastFmStatsDb.topArtists,
        usernameLower,
        period,
        SNAPSHOT_TOP_RANKING_LIMIT,
      ).then((rows) => {
        const artists = sortByRank(rows.map((row) => row.artist));
        topArtists[period] = artists;
        periodLeaders[period].artist = artists[0];
      }),
      topRowsByPeriod(
        lastFmStatsDb.topAlbums,
        usernameLower,
        period,
        SNAPSHOT_TOP_RANKING_LIMIT,
      ).then((rows) => {
        const albums = sortByRank(rows.map((row) => row.album));
        topAlbums[period] = albums;
        periodLeaders[period].album = albums[0];
      }),
      topRowsByPeriod(
        lastFmStatsDb.topTracks,
        usernameLower,
        period,
        SNAPSHOT_TOP_RANKING_LIMIT,
      ).then((rows) => {
        const tracks = sortByRank(rows.map((row) => row.track));
        topTracks[period] = tracks;
        periodLeaders[period].track = tracks[0];
      }),
    ]),
  );

  const derived = await deriveLastFmStatsAsync({
    recentTracks: allRecentTracks.map(toDerivedRecentTrack),
    profile: profile?.info,
    periodLists: {
      topAlbums,
      topArtists,
      topTracks,
    },
  });

  return {
    id: usernameLower,
    username: profile?.username ?? sync?.username ?? username.trim(),
    usernameLower,
    updatedAt: new Date().toISOString(),
    profile: profile?.info,
    sync,
    counts: {
      friends: await lastFmStatsDb.friends.where("usernameLower").equals(usernameLower).count(),
      recentTracks: recentTrackCount,
      topAlbums: topAlbumCounts,
      topArtists: topArtistCounts,
      topTracks: topTrackCounts,
    },
    derived,
    friends: friends.map((row) => row.friend),
    periodLeaders,
    recentTracks,
    topAlbums,
    topArtists,
    topTracks,
  };
};

export const refreshPublishedSnapshot = async (username: string) => {
  const snapshot = await buildStatsSnapshot(username);
  await publishStatsSnapshot(snapshot);

  return snapshot;
};

const toDerivedRecentTrack = (track: CachedRecentTrack): DerivedRecentTrack => ({
  albumName: track.albumName,
  artistName: track.artistName,
  fetchedAt: track.fetchedAt,
  id: track.id,
  loved: track.loved,
  playedAtLabel: track.playedAtLabel,
  playedAtTimestamp: track.playedAtTimestamp,
  trackName: track.trackName,
  usernameLower: track.usernameLower,
  track: {
    artist: {
      url: track.track.artist.url,
    },
    images: track.track.images,
    url: track.track.url,
  },
});
