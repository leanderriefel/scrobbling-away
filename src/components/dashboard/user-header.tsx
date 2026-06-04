import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/lastfm-stats-cache";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/utils/format";
import { getListeningSignature } from "@/utils/listening-signature";

import { useDashboardSnapshot } from "./dashboard-context";
import { HelpTooltip } from "./help-tooltip";

export function UserHeader() {
  const snapshot = useDashboardSnapshot();
  const profileImage = getImageUrl(snapshot.profile?.images);
  const signature = getListeningSignature(snapshot);
  const displayName = snapshot.profile?.name ?? snapshot.username;
  const subtitle = snapshot.profile?.realname || snapshot.profile?.country;

  return (
    <div className="grid gap-8">
      {/* Identity */}
      <div className="flex items-center gap-5">
        <Avatar size="lg" className="ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
          {profileImage && <AvatarImage src={profileImage} alt="" />}
          <AvatarFallback>{displayName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{displayName}</h1>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      {/* Key stats — big monospace numbers */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        <StatBlock
          label="Plays"
          value={formatNumber(snapshot.profile?.playcount ?? 0)}
          help="Total scrobbles reported by Last.fm."
          highlight
        />
        <StatBlock
          label="Artists"
          value={formatNumber(snapshot.derived.uniqueArtists)}
          help="Unique artists found in your scrobble history."
        />
        <StatBlock
          label="Per day"
          value={signature.averagePerDay}
          help="Average scrobbles per day since the first stored scrobble."
        />
        <StatBlock
          label="Repeat rate"
          value={formatPercent(signature.repeatRate)}
          help="Share of scrobbles for tracks seen before. Formula: repeats / scrobbles."
        />
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  help,
  highlight,
}: {
  label: string;
  value: string;
  help: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "font-mono text-3xl font-bold tabular-nums tracking-tighter",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground">
        <span>{label}</span>
        <HelpTooltip>{help}</HelpTooltip>
      </div>
    </div>
  );
}
