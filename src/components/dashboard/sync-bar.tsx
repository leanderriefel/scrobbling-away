import { AlertCircleIcon, CheckCircle2Icon, LoaderCircleIcon, PauseCircleIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { LastFmStatsSnapshot } from "@/lib/lastfm-stats-cache";
import { formatCompact, formatRelativeTime } from "@/utils/format";

const phaseLabels: Record<string, string> = {
  complete: "Up to date",
  friends: "Finding your friends",
  idle: "Ready",
  profile: "Getting your profile",
  "recent-tracks": "Loading listening history",
  snapshot: "Preparing stats",
  "top-albums": "Loading top albums",
  "top-artists": "Loading top artists",
  "top-tracks": "Loading top tracks",
};

export function SyncBar({
  isLoading,
  snapshot,
}: {
  isLoading: boolean;
  snapshot: LastFmStatsSnapshot | undefined;
}) {
  const sync = snapshot?.sync;
  const total = sync?.total ?? 0;
  const fetched = sync?.fetched ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round((fetched / total) * 100)) : 0;
  const status = sync?.status ?? "idle";
  const phase = sync?.phase ?? "idle";
  const active = isLoading;

  const label = active
    ? (phaseLabels[phase] ?? "Loading…")
    : status === "complete"
      ? `Updated ${formatRelativeTime(snapshot?.updatedAt ?? new Date().toISOString())}`
      : status === "error"
        ? (sync?.message ?? "Something went wrong")
        : status === "stopped"
          ? (sync?.message ?? "Sync stopped")
          : snapshot
            ? `Cache loaded ${formatRelativeTime(snapshot.updatedAt)}`
            : null;

  if (!label) return null;

  const detailParts = [
    `${formatCompact(snapshot?.counts.recentTracks ?? 0)} scrobbles`,
    `${formatCompact(snapshot?.counts.topArtists.overall ?? 0)} artists`,
    sync?.updatedAt ? `status ${formatRelativeTime(sync.updatedAt)}` : undefined,
  ].filter((part): part is string => Boolean(part));
  const StatusIcon = active
    ? LoaderCircleIcon
    : status === "complete"
      ? CheckCircle2Icon
      : status === "error"
        ? AlertCircleIcon
        : status === "stopped"
          ? PauseCircleIcon
          : null;

  return (
    <div className="grid gap-2 rounded-sm bg-accent/30 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        {StatusIcon && (
          <StatusIcon
            className={
              active
                ? "size-3 animate-spin text-muted-foreground"
                : status === "error"
                  ? "size-3 text-destructive"
                  : "size-3 text-muted-foreground"
            }
          />
        )}
        <span>{label}</span>
        {active && total > 0 && (
          <span className="ml-auto font-mono tabular-nums text-foreground/50">{progress}%</span>
        )}
      </div>
      {active && <Progress value={progress} className="h-[3px]" />}
      {!active && detailParts.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground/70">
          {detailParts.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
      )}
    </div>
  );
}
