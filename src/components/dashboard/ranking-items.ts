import type { TopAlbum, TopArtist, TopTrack } from "@/lib/lastfm";
import {
  getImageUrl,
  readLastFmString,
  type LastFmPeriod,
  type LastFmStatsSnapshot,
  type RankedStat,
} from "@/lib/lastfm-stats-cache";
import { artistKey, trackKey } from "@/utils/track-keys";

import type { TrackListItem } from "./track-list";

export type RankingKind = "albums" | "artists" | "tracks";

export const getArtistRankingItems = (
  snapshot: LastFmStatsSnapshot,
  period: LastFmPeriod,
): TrackListItem[] => {
  const topArtists = snapshot.topArtists[period];
  const historyArtists = snapshot.derived.topArtistsFromHistory;

  return topArtists.length > 0
    ? topArtists.map((artist) => toArtistItem(artist, historyArtists))
    : historyArtists.map(toRankedItem);
};

export const getAlbumRankingItems = (
  snapshot: LastFmStatsSnapshot,
  period: LastFmPeriod,
): TrackListItem[] => {
  const topAlbums = snapshot.topAlbums[period];
  const historyAlbums = snapshot.derived.topAlbumsFromHistory;

  return topAlbums.length > 0 ? topAlbums.map(toAlbumItem) : historyAlbums.map(toRankedItem);
};

export const getTrackRankingItems = (
  snapshot: LastFmStatsSnapshot,
  period: LastFmPeriod,
): TrackListItem[] => {
  const topTracks = snapshot.topTracks[period];
  const historyTracks = snapshot.derived.topTracksFromHistory;

  return topTracks.length > 0
    ? topTracks.map((track) => toTrackItem(track, historyTracks))
    : historyTracks.map(toRankedItem);
};

export const getRankingItems = (
  snapshot: LastFmStatsSnapshot,
  period: LastFmPeriod,
  kind: RankingKind,
): TrackListItem[] => {
  if (kind === "artists") return getArtistRankingItems(snapshot, period);
  if (kind === "albums") return getAlbumRankingItems(snapshot, period);

  return getTrackRankingItems(snapshot, period);
};

const toArtistItem = (artist: TopArtist, fallbackItems: RankedStat[]): TrackListItem => ({
  count: artist.playcount,
  id: `${artist.rank}-${artist.name}`,
  imageUrl: getImageUrl(artist.images) ?? findFallbackImage(fallbackItems, artistKey(artist.name)),
  label: artist.name,
  rank: artist.rank,
});

const toAlbumItem = (album: TopAlbum): TrackListItem => ({
  count: album.playcount,
  detail: readLastFmString(album.artist.name),
  id: `${album.rank}-${readLastFmString(album.artist.name)}-${album.name}`,
  imageUrl: getImageUrl(album.images),
  label: album.name,
  rank: album.rank,
});

const toTrackItem = (track: TopTrack, fallbackItems: RankedStat[]): TrackListItem => ({
  count: track.playcount,
  detail: readLastFmString(track.artist.name),
  id: `${track.rank}-${readLastFmString(track.artist.name)}-${track.name}`,
  imageUrl:
    getImageUrl(track.images) ??
    findFallbackImage(fallbackItems, trackKey(readLastFmString(track.artist.name), track.name)),
  label: track.name,
  rank: track.rank,
});

const toRankedItem = (item: RankedStat, index: number): TrackListItem => ({
  ...item,
  rank: index + 1,
});

const findFallbackImage = (items: RankedStat[], key: string) =>
  items.find((item) => item.id === key)?.imageUrl;
