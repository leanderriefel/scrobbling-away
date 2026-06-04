import type { TopArtist } from "@/lib/lastfm";
import { getImageUrl, type LastFmPeriod, type LastFmStatsSnapshot } from "@/lib/lastfm-stats-cache";

import { EmptyState } from "./empty-state";
import { TrackList, type TrackListItem } from "./track-list";

export const SharedArtistOverlap = ({
  selectedPeriod,
  snapshots,
}: {
  selectedPeriod: LastFmPeriod;
  snapshots: LastFmStatsSnapshot[];
}) => {
  const items = getSharedArtistItems(snapshots, selectedPeriod);

  if (items.length === 0) {
    return <EmptyState message="No shared artists in this period yet" />;
  }

  return <TrackList items={items} height="20rem" />;
};

const getSharedArtistItems = (
  snapshots: LastFmStatsSnapshot[],
  selectedPeriod: LastFmPeriod,
): TrackListItem[] => {
  const artistMaps = snapshots.map((snapshot) => {
    const entries = snapshot.topArtists[selectedPeriod].map((artist): [string, TopArtist] => [
      normalizeKeyPart(artist.name),
      artist,
    ]);

    return new Map<string, TopArtist>(entries);
  });

  const [firstMap, ...otherMaps] = artistMaps;

  if (!firstMap) return [];

  return [...firstMap.entries()]
    .filter(([key]) => otherMaps.every((map) => map.has(key)))
    .map(([key, artist]) => {
      const artists = artistMaps
        .map((map) => map.get(key))
        .filter((item): item is TopArtist => Boolean(item));
      const total = artists.reduce((sum, item) => sum + item.playcount, 0);
      const bestRank = Math.min(...artists.map((item) => item.rank ?? Number.MAX_SAFE_INTEGER));

      return {
        count: total,
        href: artist.url,
        id: key,
        imageUrl: getImageUrl(artist.images),
        label: artist.name,
        rank: bestRank,
      };
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 20);
};

const normalizeKeyPart = (value: string | undefined) => value?.trim().toLocaleLowerCase() ?? "";
