import type { TopAlbum, TopArtist, TopTrack } from "@/lib/lastfm";
import {
  LASTFM_PERIODS,
  getImageUrl,
  readLastFmString,
  type LastFmPeriod,
  type RankedStat,
} from "@/lib/lastfm-stats-cache";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useDashboardPeriod, useDashboardSnapshot } from "./dashboard-context";
import { SectionTitle } from "./section-title";
import { TrackList, type TrackListItem } from "./track-list";

const periodLabels: Record<LastFmPeriod, string> = {
  "12month": "12 months",
  "1month": "1 month",
  "3month": "3 months",
  "6month": "6 months",
  "7day": "7 days",
  overall: "All time",
};

export function Rankings() {
  const snapshot = useDashboardSnapshot();
  const { selectedPeriod, setSelectedPeriod } = useDashboardPeriod();
  const topArtists = snapshot.topArtists[selectedPeriod];
  const topAlbums = snapshot.topAlbums[selectedPeriod];
  const topTracks = snapshot.topTracks[selectedPeriod];
  const historyArtists = snapshot.derived.topArtistsFromHistory;
  const historyAlbums = snapshot.derived.topAlbumsFromHistory;
  const historyTracks = snapshot.derived.topTracksFromHistory;
  const periodSelector = (
    <Select
      value={selectedPeriod}
      onValueChange={(value) => setSelectedPeriod(value as LastFmPeriod)}
    >
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {LASTFM_PERIODS.map((p) => (
            <SelectItem key={p} value={p}>
              {periodLabels[p]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );

  const artistItems =
    topArtists.length > 0
      ? topArtists.slice(0, 20).map((artist) => toArtistItem(artist, historyArtists))
      : historyArtists.slice(0, 20).map(toRankedItem);

  const albumItems =
    topAlbums.length > 0
      ? topAlbums.slice(0, 20).map(toAlbumItem)
      : historyAlbums.slice(0, 20).map(toRankedItem);

  const trackItems =
    topTracks.length > 0
      ? topTracks.slice(0, 20).map((track) => toTrackItem(track, historyTracks))
      : historyTracks.slice(0, 20).map(toRankedItem);

  return (
    <div className="grid gap-5">
      <SectionTitle
        action={periodSelector}
        description="Ranked artists, albums, and tracks for the selected Last.fm period."
      >
        Most played
      </SectionTitle>
      <Tabs defaultValue="artists">
        <TabsList variant="line">
          <TabsTrigger value="artists">Artists</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
        </TabsList>
        <TabsContent value="artists">
          <TrackList items={artistItems} emptyMessage="No artist data yet" height="28rem" />
        </TabsContent>
        <TabsContent value="albums">
          <TrackList items={albumItems} emptyMessage="No album data yet" height="28rem" />
        </TabsContent>
        <TabsContent value="tracks">
          <TrackList items={trackItems} emptyMessage="No track data yet" height="28rem" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const toArtistItem = (artist: TopArtist, fallbackItems: RankedStat[]): TrackListItem => ({
  id: `${artist.rank}-${artist.name}`,
  rank: artist.rank,
  label: artist.name,
  count: artist.playcount,
  imageUrl: getImageUrl(artist.images) ?? findFallbackImage(fallbackItems, artistKey(artist.name)),
  href: artist.url,
});

const toAlbumItem = (album: TopAlbum): TrackListItem => ({
  id: `${album.rank}-${readLastFmString(album.artist.name)}-${album.name}`,
  rank: album.rank,
  label: album.name,
  detail: readLastFmString(album.artist.name),
  count: album.playcount,
  imageUrl: getImageUrl(album.images),
  href: album.url,
});

const toTrackItem = (track: TopTrack, fallbackItems: RankedStat[]): TrackListItem => ({
  id: `${track.rank}-${readLastFmString(track.artist.name)}-${track.name}`,
  rank: track.rank,
  label: track.name,
  detail: readLastFmString(track.artist.name),
  count: track.playcount,
  imageUrl:
    getImageUrl(track.images) ??
    findFallbackImage(fallbackItems, trackKey(readLastFmString(track.artist.name), track.name)),
  href: track.url,
});

const toRankedItem = (item: RankedStat, index: number): TrackListItem => ({
  ...item,
  rank: index + 1,
});

const findFallbackImage = (items: RankedStat[], key: string) =>
  items.find((item) => item.id === key)?.imageUrl;

const normalizeKeyPart = (value: string | undefined) => value?.trim().toLocaleLowerCase() ?? "";

const artistKey = (artistName: string) => normalizeKeyPart(artistName);

const trackKey = (artistName: string, trackName: string) =>
  `${artistKey(artistName)}:${normalizeKeyPart(trackName)}`;
