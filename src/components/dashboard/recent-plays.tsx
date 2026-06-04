import { Music2Icon } from "lucide-react";

import type { CachedRecentTrack } from "@/lib/lastfm-stats-cache";
import { getImageUrl } from "@/lib/lastfm-stats-cache";
import { formatTimeAgo } from "@/utils/format";

import { useDashboardSnapshot } from "./dashboard-context";
import { SectionTitle } from "./section-title";
import { useItemDetail } from "./item-detail-context";
import { VirtualList } from "./virtual-list";

export function RecentPlays() {
  const snapshot = useDashboardSnapshot();
  const tracks = snapshot.recentTracks;

  return (
    <div className="grid gap-5">
      <SectionTitle description="Most recent scrobbles from Last.fm.">Recently played</SectionTitle>
      {tracks.length > 0 ? (
        <VirtualList
          height="28rem"
          items={tracks}
          renderItem={(track) => <RecentPlayRow snapshot={snapshot} track={track} />}
        />
      ) : (
        <div className="py-10 text-center text-sm text-muted-foreground">No recent plays yet</div>
      )}
    </div>
  );
}

function RecentPlayRow({
  snapshot,
  track,
}: {
  snapshot: ReturnType<typeof useDashboardSnapshot>;
  track: CachedRecentTrack;
}) {
  const { openItemDetail } = useItemDetail();
  const imageUrl = getImageUrl(track.track.images);

  return (
    <button
      type="button"
      className="flex min-w-0 w-full cursor-pointer items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors duration-150 hover:bg-accent/60"
      onClick={() =>
        openItemDetail({
          kind: "track",
          artistName: track.artistName,
          imageUrl,
          playCount: 1,
          trackName: track.trackName,
          username: snapshot.username,
          usernameLower: snapshot.usernameLower,
        })
      }
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="size-9 shrink-0 rounded object-cover"
          loading="lazy"
        />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded bg-muted/60">
          <Music2Icon className="size-3.5 text-muted-foreground/50" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] leading-tight">{track.trackName}</span>
        <span className="block truncate text-[11px] leading-tight text-muted-foreground">
          {track.artistName}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground/60">
        {formatTimeAgo(track.playedAtTimestamp)}
      </span>
    </button>
  );
}
