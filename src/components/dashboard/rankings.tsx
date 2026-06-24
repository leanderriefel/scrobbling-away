import { SearchIcon, XIcon } from "lucide-react";
import { type ReactNode, useDeferredValue, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useDashboardPeriod, useDashboardSnapshot } from "./dashboard-context";
import { PeriodSelect } from "./period-select";
import {
  getAlbumRankingItems,
  getArtistRankingItems,
  getTrackRankingItems,
  type RankingKind,
} from "./ranking-items";
import { SectionTitle } from "./section-title";
import { useItemDetail } from "./item-detail-context";
import { TrackList, type TrackListItem } from "./track-list";

type SearchableRankingItem = {
  item: TrackListItem;
  searchText: string;
};

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const toSearchableRankingItems = (items: TrackListItem[]): SearchableRankingItem[] =>
  items.map((item) => ({
    item,
    searchText: normalizeSearchText(`${item.label} ${item.detail ?? ""}`),
  }));

const fuzzyScore = (text: string, query: string) => {
  if (text.includes(query)) return query.length * 4;

  let queryIndex = 0;
  let score = 0;
  let runLength = 0;

  for (let textIndex = 0; textIndex < text.length && queryIndex < query.length; textIndex++) {
    if (text[textIndex] !== query[queryIndex]) {
      runLength = 0;
      continue;
    }

    runLength += 1;
    score += 1 + runLength * 2;

    if (textIndex === 0 || text[textIndex - 1] === " ") {
      score += 3;
    }

    queryIndex += 1;
  }

  return queryIndex === query.length ? score : 0;
};

const filterRankingItems = (searchableItems: SearchableRankingItem[], rawQuery: string) => {
  const query = normalizeSearchText(rawQuery);

  if (!query) return searchableItems.map(({ item }) => item);

  const matches: { item: TrackListItem; score: number }[] = [];

  for (const { item, searchText } of searchableItems) {
    const score = fuzzyScore(searchText, query);

    if (score > 0) {
      matches.push({ item, score });
    }
  }

  matches.sort(
    (left, right) => right.score - left.score || (left.item.rank ?? 0) - (right.item.rank ?? 0),
  );

  return matches.map(({ item }) => item);
};

type RankingsProps = {
  listHeight?: string;
  showPeriodSelect?: boolean;
  showTitle?: boolean;
};

export const Rankings = ({
  listHeight = "28rem",
  showPeriodSelect = true,
  showTitle = true,
}: RankingsProps = {}) => {
  const { selectedPeriod, setSelectedPeriod } = useDashboardPeriod();

  return (
    <div className="grid gap-4">
      {showTitle && (
        <SectionTitle
          action={
            showPeriodSelect ? (
              <PeriodSelect value={selectedPeriod} onValueChange={setSelectedPeriod} />
            ) : undefined
          }
          description="Ranked artists, albums, and tracks for the selected Last.fm period."
        >
          Most played
        </SectionTitle>
      )}
      <Tabs defaultValue="artists">
        <RankingsTabList />
        <RankingsTabPanels listHeight={listHeight} />
      </Tabs>
    </div>
  );
};

export const RankingsTabList = () => (
  <TabsList variant="line">
    <TabsTrigger value="artists">Artists</TabsTrigger>
    <TabsTrigger value="albums">Albums</TabsTrigger>
    <TabsTrigger value="tracks">Tracks</TabsTrigger>
  </TabsList>
);

export const RankingsTabPanels = ({
  listHeight = "28rem",
  renderPanel,
}: {
  listHeight?: string;
  renderPanel?: (kind: RankingKind) => ReactNode;
}) => (
  <>
    <TabsContent value="artists">
      {renderPanel ? (
        renderPanel("artists")
      ) : (
        <RankingsTrackList kind="artists" listHeight={listHeight} />
      )}
    </TabsContent>
    <TabsContent value="albums">
      {renderPanel ? (
        renderPanel("albums")
      ) : (
        <RankingsTrackList kind="albums" listHeight={listHeight} />
      )}
    </TabsContent>
    <TabsContent value="tracks">
      {renderPanel ? (
        renderPanel("tracks")
      ) : (
        <RankingsTrackList kind="tracks" listHeight={listHeight} />
      )}
    </TabsContent>
  </>
);

export const RankingsTrackList = ({
  header,
  kind,
  listHeight = "28rem",
}: {
  header?: ReactNode;
  kind: RankingKind;
  listHeight?: string;
}) => {
  const snapshot = useDashboardSnapshot();
  const { selectedPeriod } = useDashboardPeriod();
  const { openItemDetail } = useItemDetail();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const items = useMemo(
    () =>
      kind === "artists"
        ? getArtistRankingItems(snapshot, selectedPeriod)
        : kind === "albums"
          ? getAlbumRankingItems(snapshot, selectedPeriod)
          : getTrackRankingItems(snapshot, selectedPeriod),
    [kind, selectedPeriod, snapshot],
  );
  const searchableItems = useMemo(() => toSearchableRankingItems(items), [items]);
  const filteredItems = useMemo(
    () => filterRankingItems(searchableItems, deferredSearchQuery),
    [deferredSearchQuery, searchableItems],
  );
  const isFiltering = searchQuery !== deferredSearchQuery;
  const searchLabel =
    kind === "artists"
      ? "Search artists"
      : kind === "albums"
        ? "Search albums or artists"
        : "Search tracks or artists";

  const handleItemClick = (item: TrackListItem) => {
    const base = {
      imageUrl: item.imageUrl,
      playCount: item.count,
      username: snapshot.username,
      usernameLower: snapshot.usernameLower,
    };

    if (kind === "artists") {
      openItemDetail({ kind: "artist", artistName: item.label, ...base });
      return;
    }

    if (kind === "albums") {
      openItemDetail({
        kind: "album",
        albumName: item.label,
        artistName: item.detail ?? "Unknown artist",
        ...base,
      });
      return;
    }

    openItemDetail({
      kind: "track",
      trackName: item.label,
      artistName: item.detail ?? "Unknown artist",
      ...base,
    });
  };

  return (
    <div className="grid min-w-0 content-start gap-4">
      {header}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          aria-label={searchLabel}
          className="pr-8 pl-8"
          placeholder={searchLabel}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {searchQuery ? (
          <Button
            aria-label="Clear search"
            className="absolute right-1 top-1/2 size-6 -translate-y-1/2 text-muted-foreground"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => setSearchQuery("")}
          >
            <XIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div className={isFiltering ? "opacity-70 transition-opacity" : "transition-opacity"}>
        <TrackList
          key={`${selectedPeriod}-${kind}-${deferredSearchQuery}`}
          items={filteredItems}
          emptyMessage={searchQuery ? `No ${kind} match "${searchQuery}"` : `No ${kind} yet`}
          height={listHeight}
          onItemClick={handleItemClick}
        />
      </div>
    </div>
  );
};
