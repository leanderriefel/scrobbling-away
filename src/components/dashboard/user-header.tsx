import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/lastfm-stats-cache";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/utils/format";
import { getListeningSignature } from "@/utils/listening-signature";

import { useDashboardSnapshot } from "./dashboard-context";
import { HelpTooltip } from "./help-tooltip";

type UserHeaderProps = {
  variant?: "compare" | "default";
};

export const UserHeader = ({ variant = "default" }: UserHeaderProps = {}) => {
  const snapshot = useDashboardSnapshot();
  const profileImage = getImageUrl(snapshot.profile?.images);
  const signature = getListeningSignature(snapshot);
  const displayName = snapshot.profile?.name ?? snapshot.username;
  const subtitle =
    readMeaningfulText(snapshot.profile?.realname) ?? readMeaningfulText(snapshot.profile?.country);
  const isCompare = variant === "compare";

  return (
    <div className="grid gap-8">
      <div className={cn("flex min-w-0 items-center", isCompare ? "gap-6" : "gap-8")}>
        <Avatar size="lg" className="shimmer-ring">
          {profileImage && <AvatarImage src={profileImage} alt="" />}
          <AvatarFallback>{displayName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          {isCompare ? (
            <h3 className="truncate text-xl font-bold tracking-tight">{displayName}</h3>
          ) : (
            <h1 className="truncate text-2xl font-bold tracking-tight">{displayName}</h1>
          )}
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-x-10 gap-y-8",
          isCompare ? "grid-cols-2 md:grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
        )}
      >
        <StatBlock
          label="Plays"
          value={formatNumber(snapshot.profile?.playcount ?? 0)}
          help="Total scrobbles reported by Last.fm."
          showHelp={!isCompare}
        />
        <StatBlock
          label="Artists"
          value={formatNumber(snapshot.derived.uniqueArtists)}
          help="Unique artists found in your scrobble history."
          showHelp={!isCompare}
        />
        <StatBlock
          label="Per day"
          value={signature.averagePerDay}
          help="Average scrobbles per day since account creation."
          showHelp={!isCompare}
        />
        <StatBlock
          label={isCompare ? "Repeat" : "Repeat rate"}
          value={formatPercent(signature.repeatRate)}
          help="Share of scrobbles for tracks seen before. Formula: repeats / scrobbles."
          showHelp={!isCompare}
        />
      </div>
    </div>
  );
};

const StatBlock = ({
  help,
  label,
  showHelp = true,
  value,
}: {
  help: string;
  label: string;
  showHelp?: boolean;
  value: string;
}) => (
  <div className="min-w-0">
    <div
      className={cn(
        "truncate font-mono text-4xl font-light tabular-nums tracking-normal metallic-text",
      )}
    >
      {value}
    </div>
    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground/80">
      <span>{label}</span>
      {showHelp && <HelpTooltip>{help}</HelpTooltip>}
    </div>
  </div>
);

const readMeaningfulText = (value: string | undefined) => {
  const text = value?.trim();

  if (!text || text.toLocaleLowerCase() === "none") return undefined;

  return text;
};
