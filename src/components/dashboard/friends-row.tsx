import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/lastfm-stats-cache";

import { useDashboardSnapshot } from "./dashboard-context";
import { HelpTooltip } from "./help-tooltip";

export function FriendsRow() {
  const snapshot = useDashboardSnapshot();

  if (snapshot.friends.length === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-muted-foreground">
        Friends
        <HelpTooltip>Last.fm friends returned for this user.</HelpTooltip>
      </span>
      <AvatarGroup>
        {snapshot.friends.slice(0, 5).map((friend) => {
          const imageUrl = getImageUrl(friend.images);

          return (
            <Avatar key={friend.name} size="sm">
              {imageUrl && <AvatarImage src={imageUrl} alt="" />}
              <AvatarFallback>{friend.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
          );
        })}
        {snapshot.counts.friends > 5 && (
          <AvatarGroupCount>+{snapshot.counts.friends - 5}</AvatarGroupCount>
        )}
      </AvatarGroup>
    </div>
  );
}
