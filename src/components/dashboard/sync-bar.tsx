import { AlertCircleIcon, LoaderCircleIcon, PauseCircleIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { LastFmStatsSnapshot } from "@/lib/lastfm-stats-cache";
import { formatRelativeTime } from "@/utils/format";

const phaseLabels: Record<string, string> = {
  complete: "Up to date",
  friends: "Finding your friends",
  idle: "Ready",
  profile: "Getting your profile",
  reconcile: "Checking for changes",
  "recent-tracks": "Loading listening history",
  snapshot: "Preparing stats",
  "top-albums": "Loading top albums",
  "top-artists": "Loading top artists",
  "top-tracks": "Loading top tracks",
};

const modeLabels: Record<string, string> = {
  quick: "Quick sync",
  deep: "Deep sync",
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
      ? `${sync?.mode ? (modeLabels[sync.mode] ?? "Sync") : "Updated"} ${formatRelativeTime(snapshot?.updatedAt ?? new Date().toISOString())}`
      : status === "error"
        ? (sync?.message ?? "Something went wrong")
        : status === "stopped"
          ? (sync?.message ?? "Sync stopped")
          : snapshot
            ? `Loaded ${formatRelativeTime(snapshot.updatedAt)}`
            : null;

  if (!label) return null;

  const StatusIcon = active
    ? LoaderCircleIcon
    : status === "error"
      ? AlertCircleIcon
      : status === "stopped"
        ? PauseCircleIcon
        : null;

  return (
    <div className="glass-panel grid gap-2 rounded-sm px-3.5 py-3">
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
    </div>
  );
}
