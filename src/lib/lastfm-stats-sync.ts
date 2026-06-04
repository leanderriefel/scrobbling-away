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
import {
  LASTFM_PERIODS,
  createCachedFriend,
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
  type LastFmSyncPhase,
} from "@/lib/lastfm-stats-cache";

const PAGE_LIMIT = 200;
const MAX_RECENT_PAGES_PER_WINDOW = 20;
const RECENT_PAGE_CONCURRENCY = 4;
const MIN_RECENT_WINDOW_SECONDS = 24 * 60 * 60;
const LASTFM_EPOCH_SECONDS = Math.floor(new Date("2002-03-20T00:00:00Z").getTime() / 1000);
const MAX_LASTFM_RETRIES = 4;
const LASTFM_RETRY_BASE_MS = 1_000;

export type LastFmStatsSyncOptions = {
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
  { includeRecentTracks = true, onProgress, onSnapshot, signal }: LastFmStatsSyncOptions = {},
) => {
  const username = usernameInput.trim();
  const usernameLower = normalizeUsername(username);
  const context: SyncContext = {
    current: {
      username,
      usernameLower,
      status: "running",
      phase: "idle",
      message: "Preparing cache",
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
    await syncFriends(context);
    await publishSnapshot(context, onSnapshot);
    await syncTopArtists(context);
    await publishSnapshot(context, onSnapshot);
    await syncTopAlbums(context);
    await publishSnapshot(context, onSnapshot);
    await syncTopTracks(context);
    await publishSnapshot(context, onSnapshot);

    if (includeRecentTracks) {
      await syncRecentTrackHistory(context, profile);
      await publishSnapshot(context, onSnapshot);
    }

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
      message: "Full cache is up to date",
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
        message: "Sync stopped. Cached data is still available.",
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
    message: "Profile cached",
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
    message: `${friends.length.toLocaleString()} friends cached`,
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
    message: `${items.length.toLocaleString()} ${phaseLabel(phase)} cached for ${periodLabels[period]}`,
    fetched: items.length,
    total: items.length,
  });
};

const syncRecentTrackHistory = async (context: SyncContext, profile: UserInfo) => {
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
        ? `Continuing from ${cacheState.count.toLocaleString()} cached scrobbles`
        : "Walking full scrobble history",
    fetched: cacheState.count,
    total: playcount,
  });

  if (remaining > 0 && from < to) {
    await syncRecentRange(context, { from, to }, saved, 0);
  }

  await emitProgress(context, {
    message: `${saved.count.toLocaleString()} scrobbles cached`,
    fetched: saved.count,
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

    await syncRecentRange(context, { from: range.from, to: midpoint }, saved, depth + 1);
    await syncRecentRange(context, { from: midpoint + 1, to: range.to }, saved, depth + 1);
    return;
  }

  await cacheRecentTracks(context, firstPage.items, saved);

  const pages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2);

  for (let index = 0; index < pages.length; index += RECENT_PAGE_CONCURRENCY) {
    throwIfAborted(context.signal);

    const batch = pages.slice(index, index + RECENT_PAGE_CONCURRENCY);
    const responses = await Promise.all(batch.map((page) => fetchRecentPage(context, range, page)));

    await cacheRecentTracks(
      context,
      responses.flatMap((response) => response.items),
      saved,
    );
    await emitProgress(context, {
      phase: "recent-tracks",
      message: `Cached ${saved.count.toLocaleString()} scrobbles`,
      fetched: saved.count,
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
) => {
  const fetchedAt = new Date().toISOString();
  const rows = tracks
    .map((track) => createCachedRecentTrack(context.usernameLower, track, fetchedAt))
    .filter((track): track is CachedRecentTrack => track !== undefined);

  if (rows.length === 0) {
    return;
  }

  await lastFmStatsDb.recentTracks.bulkPut(rows);
  saved.count += rows.length;
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
