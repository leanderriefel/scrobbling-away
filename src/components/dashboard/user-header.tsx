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
    <div className={cn("grid gap-6", !isCompare && "border-b border-border/40 pb-8")}>
      <div className={cn("flex min-w-0 items-center", isCompare ? "gap-4" : "gap-5")}>
        <Avatar size={isCompare ? "default" : "lg"} className="rounded-lg">
          {profileImage && <AvatarImage src={profileImage} alt="" className="rounded-lg" />}
          <AvatarFallback className="rounded-lg">{displayName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          {isCompare ? (
            <h3 className="truncate text-[15px] font-medium">{displayName}</h3>
          ) : (
            <h1 className="truncate text-[15px] font-medium tracking-[-0.01em] text-foreground">
              {displayName}
            </h1>
          )}
          {subtitle && (
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-x-8 gap-y-5",
          isCompare ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
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
          help="Share of scrobbles for tracks seen before."
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
    <div className="truncate font-mono text-lg tabular-nums tracking-tight text-foreground">
      {value}
    </div>
    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/80">
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
