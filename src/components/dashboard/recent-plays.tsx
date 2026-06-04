import { Music2Icon } from "lucide-react";

import type { CachedRecentTrack } from "@/lib/lastfm-stats-cache";
import { getImageUrl } from "@/lib/lastfm-stats-cache";
import { formatTimeAgo } from "@/utils/format";

import { useDashboardSnapshot } from "./dashboard-context";
import { SectionTitle } from "./section-title";
import { VirtualList } from "./virtual-list";

export function RecentPlays() {
  const tracks = useDashboardSnapshot().recentTracks;

  return (
    <div className="grid gap-5">
      <SectionTitle description="Most recent scrobbles from Last.fm.">Recently played</SectionTitle>
      {tracks.length > 0 ? (
        <VirtualList
          height="28rem"
          items={tracks}
          renderItem={(track) => <RecentPlayRow track={track} />}
        />
      ) : (
        <div className="py-10 text-center text-sm text-muted-foreground">No recent plays yet</div>
      )}
    </div>
  );
}

function RecentPlayRow({ track }: { track: CachedRecentTrack }) {
  const imageUrl = getImageUrl(track.track.images);

  return (
    <a
      href={track.track.url}
      className="flex min-w-0 items-center gap-3 rounded-sm px-2 py-2 transition-colors duration-150 hover:bg-accent/60"
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
    </a>
  );
}
