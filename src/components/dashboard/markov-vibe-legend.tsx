import type { VibeGroup } from "@/lib/markov-vibe-groups";
import { formatCompact } from "@/utils/format";

export const MarkovVibeLegend = ({ groups }: { groups: VibeGroup[] }) => {
  if (groups.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {groups.slice(0, 12).map((group) => (
        <div
          key={group.id}
          className="flex min-w-0 items-start gap-2 rounded-md bg-muted/30 px-2.5 py-2 text-xs"
        >
          <span
            className="mt-1 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: group.color }}
          />
          <div className="min-w-0">
            <div className="truncate font-medium">{group.label}</div>
            <div className="truncate text-muted-foreground">
              {group.artists.slice(1).join(", ") || "single artist"}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
              {formatCompact(group.artistIds.length)} artists ·{" "}
              {formatCompact(group.internalSwitches)} internal switches
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
