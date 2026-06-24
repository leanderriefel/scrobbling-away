import type { ListeningMode } from "@/lib/advanced-listening-analytics";
import { chartValueOpacity } from "@/utils/chart-intensity";
import { formatPercent } from "@/utils/format";

import { EmptyChart } from "../empty-chart";
import { MiniLabel } from "../mini-label";

export function RankedRows({
  label,
  help,
  rows,
}: {
  label: string;
  help: string;
  rows: Array<{ title: string; detail?: string; value: string }>;
}) {
  if (rows.length === 0) return <EmptyChart />;

  return (
    <div className="grid gap-2">
      <MiniLabel label={label} help={help} />
      {rows.map((row) => (
        <div
          key={`${row.title}-${row.detail ?? ""}-${row.value}`}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 text-xs"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">{row.title}</div>
            {row.detail && <div className="truncate text-muted-foreground">{row.detail}</div>}
          </div>
          <div className="font-mono text-muted-foreground tabular-nums">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

export function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs">
      <span className="truncate text-muted-foreground">{label}</span>
      <div className="h-2 overflow-hidden rounded-md bg-chart-track">
        <div
          className="h-full rounded-md bg-chart-1"
          style={{
            width: `${Math.max(2, (value / Math.max(max, 1e-6)) * 100)}%`,
            opacity: chartValueOpacity(max > 0 ? value / max : 0),
          }}
        />
      </div>
      <span className="text-right font-mono text-muted-foreground tabular-nums">
        {formatPercent(value)}
      </span>
    </div>
  );
}

const MODE_LABELS: Record<ListeningMode, string> = {
  explore: "New music",
  "deep-dive": "One artist",
  nostalgia: "Replays",
  shuffle: "Mixed",
};

const MODE_HELP: Record<ListeningMode, string> = {
  explore: "Mostly new tracks and multiple artists.",
  "deep-dive": "Mostly one artist.",
  nostalgia: "Mostly tracks you've played before.",
  shuffle: "Does not fit the other categories.",
};

export function formatModeLabel(mode: ListeningMode | string) {
  return MODE_LABELS[mode as ListeningMode] ?? mode;
}

export function formatModeHelp(mode: ListeningMode | string) {
  return MODE_HELP[mode as ListeningMode] ?? "Session classification.";
}

export function formatChangeMetric(metric: "volume" | "discovery" | "concentration") {
  switch (metric) {
    case "volume":
      return "play count";
    case "discovery":
      return "new track rate";
    case "concentration":
      return "artist concentration";
  }
}
