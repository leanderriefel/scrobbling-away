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
  const status = sync?.status ?? "idle";
  const phase = sync?.phase ?? "idle";
  const active = isLoading;
  const progress =
    total > 0
      ? fetched >= total
        ? 100
        : Math.min(99, Math.round((fetched / total) * 100))
      : active
        ? undefined
        : 100;

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
    <div className="grid gap-2 rounded-lg border border-border/60 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        {StatusIcon && (
          <StatusIcon
            className={
              active
                ? "size-3 animate-spin"
                : status === "error"
                  ? "size-3 text-destructive"
                  : "size-3"
            }
          />
        )}
        <span>{label}</span>
        {active && progress !== undefined && (
          <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
            {progress}%
          </span>
        )}
      </div>
      {active && progress !== undefined && <Progress value={progress} className="h-[2px]" />}
    </div>
  );
}
