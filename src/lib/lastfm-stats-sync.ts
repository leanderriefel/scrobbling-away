import {
  getFriends,
  getInfo,
  getRecentTracks,
  getTopAlbums,
  getTopArtists,
  getTopTracks,
  type Friend,
  type RecentTrack,
  type TopAlbum,
  type TopArtist,
  type TopTrack,
  type UserInfo,
} from "@/lib/lastfm";
import Dexie from "dexie";
import { env } from "@/env/web";
import {
  LASTFM_PERIODS,
  createCachedFriend,
  getImageUrl,
  createCachedRecentTrack,
  createCachedTopAlbum,
  createCachedTopArtist,
  createCachedTopTrack,
  lastFmStatsDb,
  markAbandonedSyncStopped,
  normalizeUsername,
  patchStatsSnapshot,
  refreshPublishedSnapshot,
  replaceCachedFriends,
  replaceCachedTopAlbums,
  replaceCachedTopArtists,
  replaceCachedTopTracks,
  type CachedRecentTrack,
  type LastFmPeriod,
  type LastFmStatsSnapshot,
  type LastFmSyncMeta,
  type LastFmSyncMode,
  type LastFmSyncPhase,
} from "@/lib/lastfm-stats-cache";

export type { LastFmSyncMode };

const PAGE_LIMIT = 200;
const MAX_RECENT_PAGES_PER_WINDOW = 20;
const RECENT_PAGE_CONCURRENCY = 4;
const MIN_RECENT_WINDOW_SECONDS = 24 * 60 * 60;
const LASTFM_EPOCH_SECONDS = Math.floor(new Date("2002-03-20T00:00:00Z").getTime() / 1000);
const MAX_LASTFM_RETRIES = 4;
const LASTFM_RETRY_BASE_MS = 1_000;
export type LastFmStatsSyncOptions = {
  mode?: LastFmSyncMode;
  includeRecentTracks?: boolean;
  onProgress?: (progress: LastFmSyncMeta) => void;
  onSnapshot?: (snapshot: LastFmStatsSnapshot) => void;
  signal?: AbortSignal;
};

type SyncContext = {
  current: LastFmSyncMeta;
  onProgress?: (progress: LastFmSyncMeta) => void;
  signal?: AbortSignal;
  username: string;
  usernameLower: string;
};

type RecentRange = {
  from: number;
  to: number;
};

const periodLabels: Record<LastFmPeriod, string> = {
  "12month": "last 12 months",
  "1month": "last month",
  "3month": "last 3 months",
  "6month": "last 6 months",
  "7day": "last 7 days",
  overall: "overall",
};

export const hydrateStatsSnapshotFromCache = async (username: string) => {
  const snapshot = await refreshPublishedSnapshot(username);

  return snapshot;
};

export const syncLastFmStats = async (
  usernameInput: string,
  {
    mode = "deep",
    includeRecentTracks = true,
    onProgress,
    onSnapshot,
    signal,
  }: LastFmStatsSyncOptions = {},
) => {
  const username = usernameInput.trim();
  const usernameLower = normalizeUsername(username);
  const context: SyncContext = {
    current: {
      username,
      usernameLower,
      status: "running",
      phase: "idle",
      mode,
      message: mode === "quick" ? "Preparing quick sync" : "Preparing deep sync",
      fetched: 0,
      updatedAt: new Date().toISOString(),
    },
    onProgress,
    signal,
    username,
    usernameLower,
  };

  if (!username) {
    throw new Error("Enter a Last.fm username.");
  }

  await markAbandonedSyncStopped(username);
  await emitProgress(context, {
    phase: "profile",
    message: "Loading profile",
    fetched: 0,
    total: 1,
  });

  try {
    const profile = await syncProfile(context);
    await publishSnapshot(context, onSnapshot);

    if (mode === "deep") {
      await syncFriends(context);
      await publishSnapshot(context, onSnapshot);
      await syncTopArtists(context);
      await publishSnapshot(context, onSnapshot);
      await syncTopAlbums(context);
      await publishSnapshot(context, onSnapshot);
      await syncTopTracks(context);
      await publishSnapshot(context, onSnapshot);
    }

    if (includeRecentTracks) {
      if (mode === "quick") {
        await syncRecentTrackHistoryQuick(context, profile);
      } else {
        await syncRecentTrackHistoryDeep(context, profile);
      }
      await publishSnapshot(context, onSnapshot);
    }

    await resolveMissingImages(context);

    await emitProgress(context, {
      phase: "snapshot",
      message: "Preparing stats",
      fetched: 0,
      total: undefined,
    });

    const snapshot = await publishSnapshot(context, onSnapshot);

    await emitProgress(context, {
      status: "complete",
      phase: "complete",
      message: "Already up to date",
      fetched: 1,
      total: 1,
      completedAt: new Date().toISOString(),
    });

    return {
      ...snapshot,
      sync: context.current,
      updatedAt: context.current.updatedAt,
    };
  } catch (error) {
    if (isAbortError(error)) {
      await emitProgress(context, {
        status: "stopped",
        message: "Sync stopped. Your synced data is still available.",
      });
      return await publishSnapshot(context, onSnapshot);
    }

    const message = error instanceof Error ? error.message : "Last.fm sync failed.";

    await emitProgress(context, {
      status: "error",
      message,
      error: message,
    });
    await publishSnapshot(context, onSnapshot);

    throw error;
  }
};

const syncProfile = async (context: SyncContext) => {
  throwIfAborted(context.signal);

  const profile = await withLastFmRetry(context, "profile", () =>
    getInfo({ user: context.username }),
  );
  const fetchedAt = new Date().toISOString();

  await lastFmStatsDb.profiles.put({
    username: profile.name,
    usernameLower: context.usernameLower,
    fetchedAt,
    info: profile,
  });
  await emitProgress(context, {
    fetched: 1,
    total: 1,
    message: "Profile saved",
  });

  return profile;
};

const syncFriends = async (context: SyncContext) => {
  await emitProgress(context, {
    phase: "friends",
    message: "Loading friends",
    fetched: 0,
    total: undefined,
  });

  const friends = await fetchPaginated<Friend>(
    (page) =>
      getFriends({
        user: context.username,
        limit: PAGE_LIMIT,
        page,
        recentTracks: true,
      }).then((response) => ({
        items: response.friends,
        totalPages: response.meta.totalPages,
        total: response.meta.total,
      })),
    context,
  );
  const fetchedAt = new Date().toISOString();

  await replaceCachedFriends(
    context.usernameLower,
    friends.map((friend) => createCachedFriend(context.usernameLower, friend, fetchedAt)),
  );
  await emitProgress(context, {
    message: `${friends.length.toLocaleString()} friends saved`,
    fetched: friends.length,
    total: friends.length,
  });
};

const syncTopArtists = async (context: SyncContext) => {
  for (const period of LASTFM_PERIODS) {
    await syncTopPeriod<TopArtist>(
      context,
      "top-artists",
      period,
      (page) =>
        getTopArtists({ user: context.username, limit: PAGE_LIMIT, page, period }).then(
          (response) => ({
            items: response.artists,
            totalPages: response.meta.totalPages,
            total: response.meta.total,
          }),
        ),
      async (items, fetchedAt) => {
        await replaceCachedTopArtists(
          context.usernameLower,
          period,
          items.map((artist) =>
            createCachedTopArtist(context.usernameLower, period, artist, fetchedAt),
          ),
        );
      },
    );
  }
};

const syncTopAlbums = async (context: SyncContext) => {
  for (const period of LASTFM_PERIODS) {
    await syncTopPeriod<TopAlbum>(
      context,
      "top-albums",
      period,
      (page) =>
        getTopAlbums({ user: context.username, limit: PAGE_LIMIT, page, period }).then(
          (response) => ({
            items: response.albums,
            totalPages: response.meta.totalPages,
            total: response.meta.total,
          }),
        ),
      async (items, fetchedAt) => {
        await replaceCachedTopAlbums(
          context.usernameLower,
          period,
          items.map((album) =>
            createCachedTopAlbum(context.usernameLower, period, album, fetchedAt),
          ),
        );
      },
    );
  }
};

const syncTopTracks = async (context: SyncContext) => {
  for (const period of LASTFM_PERIODS) {
    await syncTopPeriod<TopTrack>(
      context,
      "top-tracks",
      period,
      (page) =>
        getTopTracks({ user: context.username, limit: PAGE_LIMIT, page, period }).then(
          (response) => ({
            items: response.tracks,
            totalPages: response.meta.totalPages,
            total: response.meta.total,
          }),
        ),
      async (items, fetchedAt) => {
        await replaceCachedTopTracks(
          context.usernameLower,
          period,
          items.map((track) =>
            createCachedTopTrack(context.usernameLower, period, track, fetchedAt),
          ),
        );
      },
    );
  }
};

const syncTopPeriod = async <TItem>(
  context: SyncContext,
  phase: Extract<LastFmSyncPhase, "top-artists" | "top-albums" | "top-tracks">,
  period: LastFmPeriod,
  fetchPage: (page: number) => Promise<{
    items: TItem[];
    total: number;
    totalPages: number;
  }>,
  replaceCache: (items: TItem[], fetchedAt: string) => Promise<void>,
) => {
  await emitProgress(context, {
    phase,
    message: `Loading ${phaseLabel(phase)} for ${periodLabels[period]}`,
    fetched: 0,
    total: undefined,
  });

  const items = await fetchPaginated(fetchPage, context);
  const fetchedAt = new Date().toISOString();

  await replaceCache(items, fetchedAt);
  await emitProgress(context, {
    message: `${items.length.toLocaleString()} ${phaseLabel(phase)} saved for ${periodLabels[period]}`,
    fetched: items.length,
    total: items.length,
  });
};

const syncRecentTrackHistoryQuick = async (context: SyncContext, profile: UserInfo) => {
  const registeredAt = profile.registered?.timestamp ?? LASTFM_EPOCH_SECONDS;
  const to = Math.floor(Date.now() / 1000);
  const cacheState = await getRecentTrackCacheState(context.usernameLower);
  const playcount = profile.playcount ?? cacheState.count;
  const from =
    cacheState.latestTimestamp === undefined
      ? registeredAt
      : Math.min(cacheState.latestTimestamp + 1, to);
  const saved = { count: cacheState.count };
  const remaining = Math.max(0, playcount - cacheState.count);

  await emitProgress(context, {
    phase: "recent-tracks",
    message:
      cacheState.count > 0
        ? `Fetching scrobbles after ${cacheState.count.toLocaleString()} saved`
        : "Walking full scrobble history",
    fetched: cacheState.count,
    total: playcount,
  });

  if (remaining > 0 && from < to) {
    await syncRecentRange(context, { from, to }, saved, 0);
  } else if (cacheState.count > 0) {
    await emitProgress(context, {
      message: "Already up to date",
      fetched: cacheState.count,
      total: playcount,
    });
    return;
  }

  await emitProgress(context, {
    message: `${saved.count.toLocaleString()} scrobbles saved`,
    fetched: saved.count,
    total: playcount,
  });
};

const syncRecentTrackHistoryDeep = async (context: SyncContext, profile: UserInfo) => {
  const registeredAt = profile.registered?.timestamp ?? LASTFM_EPOCH_SECONDS;
  const to = Math.floor(Date.now() / 1000);
  const cacheState = await getRecentTrackCacheState(context.usernameLower);
  const playcount = profile.playcount ?? cacheState.count;
  const saved = { count: 0 };
  const remoteIds = new Set<string>();

  await emitProgress(context, {
    phase: "recent-tracks",
    message: "Re-fetching full scrobble history",
    fetched: 0,
    total: playcount,
  });

  await syncRecentRange(context, { from: registeredAt, to }, saved, 0, remoteIds);

  await emitProgress(context, {
    phase: "reconcile",
    message: "Checking for removed or edited scrobbles",
    fetched: saved.count,
    total: playcount,
  });

  const localTracks = await lastFmStatsDb.recentTracks
    .where("usernameLower")
    .equals(context.usernameLower)
    .toArray();
  const orphanedIds = localTracks
    .filter((track) => !remoteIds.has(track.id))
    .map((track) => track.id);

  if (orphanedIds.length > 0) {
    await lastFmStatsDb.recentTracks.bulkDelete(orphanedIds);
  }

  const verifiedCount = remoteIds.size;

  await emitProgress(context, {
    message:
      orphanedIds.length > 0
        ? `Verified ${verifiedCount.toLocaleString()} scrobbles, removed ${orphanedIds.length.toLocaleString()} outdated`
        : `${verifiedCount.toLocaleString()} scrobbles verified`,
    fetched: verifiedCount,
    total: playcount,
  });
};

const getRecentTrackCacheState = async (usernameLower: string) => {
  const [count, latestTrack] = await Promise.all([
    lastFmStatsDb.recentTracks.where("usernameLower").equals(usernameLower).count(),
    lastFmStatsDb.recentTracks
      .where("[usernameLower+playedAtTimestamp]")
      .between([usernameLower, Dexie.minKey], [usernameLower, Dexie.maxKey])
      .reverse()
      .first(),
  ]);

  return {
    count,
    latestTimestamp: latestTrack?.playedAtTimestamp,
  };
};

const syncRecentRange = async (
  context: SyncContext,
  range: RecentRange,
  saved: { count: number },
  depth: number,
  collectedIds?: Set<string>,
) => {
  throwIfAborted(context.signal);

  if (range.to <= range.from) {
    return;
  }

  const firstPage = await fetchRecentPage(context, range, 1);
  const totalPages = firstPage.totalPages;
  const windowSeconds = range.to - range.from;

  if (
    totalPages > MAX_RECENT_PAGES_PER_WINDOW &&
    windowSeconds > MIN_RECENT_WINDOW_SECONDS &&
    depth < 24
  ) {
    const midpoint = Math.floor(range.from + windowSeconds / 2);

    await syncRecentRange(
      context,
      { from: range.from, to: midpoint },
      saved,
      depth + 1,
      collectedIds,
    );
    await syncRecentRange(
      context,
      { from: midpoint + 1, to: range.to },
      saved,
      depth + 1,
      collectedIds,
    );
    return;
  }

  await cacheRecentTracks(context, firstPage.items, saved, collectedIds);

  const pages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2);

  for (let index = 0; index < pages.length; index += RECENT_PAGE_CONCURRENCY) {
    throwIfAborted(context.signal);

    const batch = pages.slice(index, index + RECENT_PAGE_CONCURRENCY);
    const responses = await Promise.all(batch.map((page) => fetchRecentPage(context, range, page)));

    await cacheRecentTracks(
      context,
      responses.flatMap((response) => response.items),
      saved,
      collectedIds,
    );
    await emitProgress(context, {
      phase: "recent-tracks",
      message: collectedIds
        ? `${collectedIds.size.toLocaleString()} scrobbles verified`
        : `${saved.count.toLocaleString()} scrobbles saved`,
      fetched: collectedIds ? collectedIds.size : saved.count,
      total: context.current.total,
    });
  }
};

const fetchRecentPage = async (context: SyncContext, range: RecentRange, page: number) => {
  throwIfAborted(context.signal);

  const response = await withLastFmRetry(context, `recent tracks page ${page}`, () =>
    getRecentTracks({
      user: context.username,
      limit: PAGE_LIMIT,
      page,
      extended: true,
      from: new Date(range.from * 1000),
      to: new Date(range.to * 1000),
    }),
  );

  return {
    items: response.tracks,
    total: response.meta.total,
    totalPages: response.meta.totalPages,
  };
};

const cacheRecentTracks = async (
  context: SyncContext,
  tracks: RecentTrack[],
  saved: { count: number },
  collectedIds?: Set<string>,
) => {
  const fetchedAt = new Date().toISOString();
  const rows = tracks
    .map((track) => createCachedRecentTrack(context.usernameLower, track, fetchedAt))
    .filter((track): track is CachedRecentTrack => track !== undefined);

  if (rows.length === 0) {
    return;
  }

  await lastFmStatsDb.recentTracks.bulkPut(rows);

  if (collectedIds) {
    for (const row of rows) {
      collectedIds.add(row.id);
    }
  } else {
    saved.count += rows.length;
  }
};

const fetchPaginated = async <TItem>(
  fetchPage: (page: number) => Promise<{
    items: TItem[];
    total: number;
    totalPages: number;
  }>,
  context: SyncContext,
) => {
  throwIfAborted(context.signal);

  const firstPage = await withLastFmRetry(context, "page 1", () => fetchPage(1));
  const items = [...firstPage.items];
  const totalPages = firstPage.totalPages;

  await emitProgress(context, {
    fetched: Math.min(items.length, firstPage.total),
    total: firstPage.total,
  });

  for (let page = 2; page <= totalPages; page += 1) {
    throwIfAborted(context.signal);

    const response = await withLastFmRetry(context, `page ${page}`, () => fetchPage(page));

    items.push(...response.items);
    await emitProgress(context, {
      fetched: Math.min(items.length, response.total),
      total: response.total,
    });
  }

  return items;
};

const publishSnapshot = async (
  context: SyncContext,
  onSnapshot: ((snapshot: LastFmStatsSnapshot) => void) | undefined,
) => {
  const snapshot = await refreshPublishedSnapshot(context.username);

  onSnapshot?.(snapshot);
  return snapshot;
};

const emitProgress = async (
  context: SyncContext,
  progress: Partial<Omit<LastFmSyncMeta, "updatedAt" | "username" | "usernameLower">>,
) => {
  const updatedAt = new Date().toISOString();
  const next: LastFmSyncMeta = {
    ...context.current,
    ...progress,
    username: context.username,
    usernameLower: context.usernameLower,
    updatedAt,
  };

  context.current = next;
  await lastFmStatsDb.syncMeta.put(next);
  await patchStatsSnapshot(context.username, {
    sync: next,
    updatedAt,
  });
  context.onProgress?.(next);
};

const withLastFmRetry = async <TResult>(
  context: SyncContext,
  label: string,
  action: () => Promise<TResult>,
) => {
  for (let attempt = 0; attempt <= MAX_LASTFM_RETRIES; attempt += 1) {
    throwIfAborted(context.signal);

    try {
      return await action();
    } catch (error) {
      if (isAbortError(error) || attempt === MAX_LASTFM_RETRIES || !isRetryableLastFmError(error)) {
        throw error;
      }

      const retryNumber = attempt + 1;
      const retryDelay = LASTFM_RETRY_BASE_MS * 2 ** attempt;

      await emitProgress(context, {
        message: `Retrying ${label} after Last.fm error (${retryNumber}/${MAX_LASTFM_RETRIES})`,
      });
      await sleep(retryDelay, context.signal);
    }
  }

  throw new Error(`Last.fm request failed for ${label}.`);
};

const sleep = (duration: number, signal: AbortSignal | undefined) =>
  new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, duration);

    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Sync stopped", "AbortError"));
      },
      { once: true },
    );
  });

const phaseLabel = (phase: LastFmSyncPhase) =>
  phase
    .split("-")
    .map((part) => part[0]?.toLocaleUpperCase() + part.slice(1))
    .join(" ");

const throwIfAborted = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) {
    throw new DOMException("Sync stopped", "AbortError");
  }
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const isRetryableLastFmError = (error: unknown) => {
  if (error instanceof TypeError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /fetch|network|operation failed|rate limit|status 429|status 5|timeout|try again/i.test(
    error.message,
  );
};

const isValidImage = (images: Array<{ "#text": string; size: string }> | undefined) => {
  const url = getImageUrl(images);
  if (!url) return false;
  return !url.includes("2a96cbd") && !url.includes("placeholder_") && !url.includes("default_");
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchArtistWikidataId = async (mbid: string): Promise<string | undefined> => {
  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`,
      {
        headers: {
          "User-Agent": "ScrobblingAway/1.0.0 (https://github.com/leanderriefel/scrobbling-away)",
        },
      },
    );
    if (response.ok) {
      const data = await response.json();
      const relations = data.relations || [];
      const wikidataRelation = relations.find(
        (rel: any) =>
          rel.type === "wikidata" ||
          (rel.url && rel.url.resource && rel.url.resource.includes("wikidata.org/wiki/")),
      );
      if (wikidataRelation?.url?.resource) {
        const urlStr = wikidataRelation.url.resource;
        const match = urlStr.match(/\/entity\/(Q[0-9]+)/) || urlStr.match(/\/wiki\/(Q[0-9]+)/);
        if (match) {
          return match[1];
        }
      }
    }
  } catch (e) {
    console.error(`Failed to fetch MusicBrainz artist for mbid ${mbid}:`, e);
  }
  return undefined;
};

const fetchWikidataImageFilename = async (wikidataId: string): Promise<string | undefined> => {
  try {
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${wikidataId}&property=P18&format=json&origin=*`,
    );
    if (response.ok) {
      const data = await response.json();
      const claims = data.claims?.P18 || [];
      const filename = claims[0]?.mainsnak?.datavalue?.value;
      if (typeof filename === "string") {
        return filename;
      }
    }
  } catch (e) {
    console.error(`Failed to fetch Wikidata claims for ${wikidataId}:`, e);
  }
  return undefined;
};

const fetchWikimediaImageUrl = async (filename: string): Promise<string | undefined> => {
  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json&origin=*`,
    );
    if (response.ok) {
      const data = await response.json();
      const pages = data.query?.pages || {};
      const pageId = Object.keys(pages)[0];
      if (pageId) {
        const imageUrl = pages[pageId]?.imageinfo?.[0]?.url;
        if (imageUrl) {
          return imageUrl;
        }
      }
    }
  } catch (e) {
    console.error(`Failed to fetch Wikimedia image URL for ${filename}:`, e);
  }
  return undefined;
};

const fetchArtistImageFromWikimedia = async (mbid: string): Promise<string | undefined> => {
  const wikidataId = await fetchArtistWikidataId(mbid);
  if (!wikidataId) return undefined;

  const filename = await fetchWikidataImageFilename(wikidataId);
  if (!filename) return undefined;

  return await fetchWikimediaImageUrl(filename);
};

const fetchTrackAlbumImage = async (
  name: string,
  artistName: string,
): Promise<string | undefined> => {
  try {
    const url = new URL("https://ws.audioscrobbler.com/2.0/");
    url.searchParams.set("method", "track.getInfo");
    url.searchParams.set("api_key", env.VITE_LASTFM_KEY);
    url.searchParams.set("artist", artistName);
    url.searchParams.set("track", name);
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString());
    if (response.ok) {
      const data = await response.json();
      const images = data.track?.album?.image;
      if (images) {
        return getImageUrl(images);
      }
    }
  } catch (e) {
    console.error(`Failed to fetch track info from Last.fm for "${name}" by "${artistName}":`, e);
  }
  return undefined;
};

const resolveArtistImages = async (context: SyncContext) => {
  const topArtists = await lastFmStatsDb.topArtists
    .where("usernameLower")
    .equals(context.usernameLower)
    .toArray();

  const missingArtistsMap = new Map<
    string,
    { name: string; mbid?: string; bestRank: number; key: string }
  >();
  for (const item of topArtists) {
    const artist = item.artist;
    if (artist && !isValidImage(artist.images)) {
      const artistName = (artist.name as string) || "";
      const key = artist.mbid || artistName.toLowerCase().trim();
      const existing = missingArtistsMap.get(key);
      const rank = item.rank || 200;
      if (!existing || rank < existing.bestRank) {
        missingArtistsMap.set(key, {
          name: artistName,
          mbid: artist.mbid,
          bestRank: rank,
          key,
        });
      }
    }
  }

  const missingArtists = Array.from(missingArtistsMap.values());
  if (missingArtists.length === 0) return;

  missingArtists.sort((a, b) => a.bestRank - b.bestRank);

  const maxArtistsToResolve = 50;
  const toResolve = missingArtists.slice(0, maxArtistsToResolve);

  for (let i = 0; i < toResolve.length; i++) {
    throwIfAborted(context.signal);
    const artist = toResolve[i];
    if (artist && artist.mbid) {
      await emitProgress(context, {
        message: `Resolving artist images from MusicBrainz (${i + 1}/${toResolve.length}): ${artist.name}`,
      });

      if (i > 0) {
        await delay(1000);
      }

      const imageUrl = await fetchArtistImageFromWikimedia(artist.mbid);
      if (imageUrl) {
        await lastFmStatsDb.transaction("rw", lastFmStatsDb.topArtists, async () => {
          const matchingItems = topArtists.filter((item) => {
            const itemArtist = item.artist;
            if (!itemArtist) return false;
            const itemArtistName = (itemArtist.name as string) || "";
            const itemKey = itemArtist.mbid || itemArtistName.toLowerCase().trim();
            return itemKey === artist.key;
          });
          for (const item of matchingItems) {
            if (item.artist) {
              item.artist.images = [{ "#text": imageUrl, size: "extralarge" }];
              await lastFmStatsDb.topArtists.put(item);
            }
          }
        });
      }
    }
  }
};

const resolveTrackImages = async (context: SyncContext) => {
  const topTracks = await lastFmStatsDb.topTracks
    .where("usernameLower")
    .equals(context.usernameLower)
    .toArray();

  const missingTracksMap = new Map<
    string,
    { name: string; artistName: string; bestRank: number; key: string }
  >();
  for (const item of topTracks) {
    const track = item.track;
    if (track && !isValidImage(track.images)) {
      const artistName = (track.artist.name as string) || "";
      const key = `${artistName.toLowerCase().trim()}:${track.name.toLowerCase().trim()}`;
      const existing = missingTracksMap.get(key);
      const rank = item.rank || 200;
      if (!existing || rank < existing.bestRank) {
        missingTracksMap.set(key, {
          name: track.name,
          artistName,
          bestRank: rank,
          key,
        });
      }
    }
  }

  const missingTracks = Array.from(missingTracksMap.values());
  if (missingTracks.length === 0) return;

  missingTracks.sort((a, b) => a.bestRank - b.bestRank);

  const maxTracksToResolve = 50;
  const toResolve = missingTracks.slice(0, maxTracksToResolve);

  for (let i = 0; i < toResolve.length; i++) {
    throwIfAborted(context.signal);
    const track = toResolve[i];
    if (track) {
      await emitProgress(context, {
        message: `Resolving track album covers from Last.fm (${i + 1}/${toResolve.length}): ${track.name}`,
      });

      if (i > 0) {
        await delay(150);
      }

      const imageUrl = await fetchTrackAlbumImage(track.name, track.artistName);
      if (imageUrl) {
        await lastFmStatsDb.transaction("rw", lastFmStatsDb.topTracks, async () => {
          const matchingItems = topTracks.filter((item) => {
            const itemTrack = item.track;
            if (!itemTrack) return false;
            const artistName = (itemTrack.artist.name as string) || "";
            const key = `${artistName.toLowerCase().trim()}:${itemTrack.name.toLowerCase().trim()}`;
            return key === track.key;
          });
          for (const item of matchingItems) {
            if (item.track) {
              item.track.images = [{ "#text": imageUrl, size: "extralarge" }];
              await lastFmStatsDb.topTracks.put(item);
            }
          }
        });
      }
    }
  }
};

const resolveRecentTrackImages = async (context: SyncContext) => {
  const recentTracks = await lastFmStatsDb.recentTracks
    .where("usernameLower")
    .equals(context.usernameLower)
    .reverse()
    .limit(30)
    .toArray();

  const missingTracksMap = new Map<string, { name: string; artistName: string; key: string }>();
  for (const item of recentTracks) {
    const track = item.track;
    if (track && !isValidImage(track.images)) {
      const key = `${item.artistName.toLowerCase().trim()}:${item.trackName.toLowerCase().trim()}`;
      missingTracksMap.set(key, { name: item.trackName, artistName: item.artistName, key });
    }
  }

  const missingTracks = Array.from(missingTracksMap.values());
  if (missingTracks.length === 0) return;

  for (let i = 0; i < missingTracks.length; i++) {
    throwIfAborted(context.signal);
    const track = missingTracks[i];
    if (track) {
      await emitProgress(context, {
        message: `Resolving recent play album covers from Last.fm (${i + 1}/${missingTracks.length}): ${track.name}`,
      });

      if (i > 0) {
        await delay(150);
      }

      const imageUrl = await fetchTrackAlbumImage(track.name, track.artistName);
      if (imageUrl) {
        await lastFmStatsDb.transaction("rw", lastFmStatsDb.recentTracks, async () => {
          const matchingItems = recentTracks.filter((item) => {
            const key = `${item.artistName.toLowerCase().trim()}:${item.trackName.toLowerCase().trim()}`;
            return key === track.key;
          });
          for (const item of matchingItems) {
            if (item.track) {
              item.track.images = [{ "#text": imageUrl, size: "extralarge" }];
              await lastFmStatsDb.recentTracks.put(item);
            }
          }
        });
      }
    }
  }
};

const resolveMissingImages = async (context: SyncContext) => {
  throwIfAborted(context.signal);
  await emitProgress(context, {
    message: "Resolving missing artist and track images",
  });

  try {
    await resolveArtistImages(context);
    await resolveTrackImages(context);
    await resolveRecentTrackImages(context);
  } catch (error) {
    console.error("Failed to resolve missing images:", error);
  }
};
