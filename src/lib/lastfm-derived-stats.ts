import type { TopAlbum, TopArtist, TopTrack, UserInfo } from "@/lib/lastfm";
import { deriveListeningAnalytics } from "@/lib/listening-analytics";
import type {
  CachedRecentTrack,
  LastFmDerivedStats,
  LastFmPeriod,
  RankedStat,
} from "@/lib/lastfm-stats-cache";

export type DerivedRecentTrack = Pick<
  CachedRecentTrack,
  | "albumName"
  | "artistName"
  | "fetchedAt"
  | "id"
  | "loved"
  | "playedAtLabel"
  | "playedAtTimestamp"
  | "trackName"
  | "usernameLower"
> & {
  track: Pick<CachedRecentTrack["track"], "images" | "url"> & {
    artist: Pick<CachedRecentTrack["track"]["artist"], "url">;
  };
};

export type LastFmDerivedStatsInput = {
  periodLists: {
    topAlbums: Record<LastFmPeriod, TopAlbum[]>;
    topArtists: Record<LastFmPeriod, TopArtist[]>;
    topTracks: Record<LastFmPeriod, TopTrack[]>;
  };
  profile?: UserInfo;
  recentTracks: DerivedRecentTrack[];
};

export const deriveLastFmStats = ({
  periodLists,
  profile,
  recentTracks,
}: LastFmDerivedStatsInput): LastFmDerivedStats => {
  const albumStats = new Map<string, RankedStat>();
  const artistStats = new Map<string, RankedStat>();
  const trackStats = new Map<string, RankedStat>();
  const years = new Map<string, number>();
  const hours = new Map<string, number>();
  const weekdays = new Map<string, number>();
  let lovedTracks = 0;
  let firstScrobble: CachedRecentTrack | undefined;
  let lastScrobble: CachedRecentTrack | undefined;

  for (const recentTrack of recentTracks) {
    const playedAt = new Date(recentTrack.playedAtTimestamp * 1000);
    const year = playedAt.getFullYear().toString();
    const hour = playedAt.getHours().toString().padStart(2, "0");
    const weekday = playedAt.toLocaleDateString(undefined, { weekday: "short" });
    const artistKey = normalizeKeyPart(recentTrack.artistName);
    const trackKey = `${artistKey}:${normalizeKeyPart(recentTrack.trackName)}`;
    const albumKey = `${artistKey}:${normalizeKeyPart(recentTrack.albumName)}`;

    if (recentTrack.loved) {
      lovedTracks += 1;
    }

    if (!firstScrobble || recentTrack.playedAtTimestamp < firstScrobble.playedAtTimestamp) {
      firstScrobble = recentTrack as CachedRecentTrack;
    }

    if (!lastScrobble || recentTrack.playedAtTimestamp > lastScrobble.playedAtTimestamp) {
      lastScrobble = recentTrack as CachedRecentTrack;
    }

    years.set(year, (years.get(year) ?? 0) + 1);
    hours.set(hour, (hours.get(hour) ?? 0) + 1);
    weekdays.set(weekday, (weekdays.get(weekday) ?? 0) + 1);

    incrementRanked(artistStats, artistKey, {
      imageUrl: getImageUrl(recentTrack.track.images),
      label: recentTrack.artistName,
      url: readOptionalString(recentTrack.track.artist.url),
    });

    incrementRanked(trackStats, trackKey, {
      detail: recentTrack.artistName,
      imageUrl: getImageUrl(recentTrack.track.images),
      label: recentTrack.trackName,
      url: recentTrack.track.url,
    });

    if (recentTrack.albumName) {
      incrementRanked(albumStats, albumKey, {
        detail: recentTrack.artistName,
        imageUrl: getImageUrl(recentTrack.track.images),
        label: recentTrack.albumName,
      });
    }
  }

  const profilePlaycount = profile?.playcount ?? 0;

  return {
    analytics: deriveListeningAnalytics(recentTracks as CachedRecentTrack[], periodLists),
    firstScrobble,
    lastScrobble,
    lovedTracks,
    scrobbleCoverage: profilePlaycount > 0 ? recentTracks.length / profilePlaycount : 0,
    uniqueAlbums: albumStats.size,
    uniqueArtists: artistStats.size,
    uniqueTracks: trackStats.size,
    topAlbumsFromHistory: takeTopStats(albumStats, 50),
    topArtistsFromHistory: takeTopStats(artistStats, 50),
    topTracksFromHistory: takeTopStats(trackStats, 50),
    scrobblesByHour: [...hours.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, count]) => ({ label, count })),
    scrobblesByWeekday: [...weekdays.entries()].map(([label, count]) => ({ label, count })),
    scrobblesByYear: [...years.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, count]) => ({ label, count })),
  };
};

const takeTopStats = (stats: Map<string, RankedStat>, limit: number) =>
  [...stats.values()].sort((left, right) => right.count - left.count).slice(0, limit);

const incrementRanked = (
  stats: Map<string, RankedStat>,
  key: string,
  value: Omit<RankedStat, "count" | "id">,
) => {
  const current = stats.get(key);

  if (current) {
    current.count += 1;
    current.imageUrl ??= value.imageUrl;
    current.url ??= value.url;
    return;
  }

  stats.set(key, {
    id: key,
    count: 1,
    ...value,
  });
};

const getImageUrl = (
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

const readOptionalString = (value: unknown) =>
  typeof value === "string" && value ? value : undefined;

const normalizeKeyPart = (value: string | undefined) => value?.trim().toLocaleLowerCase() ?? "";
