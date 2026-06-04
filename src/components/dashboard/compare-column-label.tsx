import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/lastfm-stats-cache";
import { formatCompact } from "@/utils/format";

import { useDashboardSnapshot } from "./dashboard-context";

export const CompareColumnLabel = () => {
  const snapshot = useDashboardSnapshot();
  const displayName = snapshot.profile?.name ?? snapshot.username;
  const profileImage = getImageUrl(snapshot.profile?.images);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="sm">
        {profileImage && <AvatarImage src={profileImage} alt="" />}
        <AvatarFallback>{displayName.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{displayName}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          {formatCompact(snapshot.counts.recentTracks)} cached scrobbles
        </div>
      </div>
    </div>
  );
};
