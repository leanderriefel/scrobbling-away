import { cn } from "@/lib/utils";
import {
  chartBarCastGradient,
  chartBarNeighborCast,
  chartValueOpacity,
} from "@/utils/chart-intensity";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

type ChartBarProps = {
  value: number;
  className?: string;
  tooltip?: string;
  minHeightPercent?: number;
  animationDelayMs?: number;
  /** When set, drives fill opacity instead of `value` (e.g. height from one ratio, intensity from another). */
  intensity?: number;
  /** Neighbor heights in the same series (0–1) for depth shadows when a side is taller. */
  leftValue?: number;
  rightValue?: number;
};

const ChartBarCastOverlay = ({ side, strength }: { side: "left" | "right"; strength: number }) => {
  if (strength <= 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10",
        side === "left" ? "left-0" : "right-0",
      )}
      style={{
        width: `${24 + strength * 28}%`,
        background: chartBarCastGradient(side, strength),
      }}
    />
  );
};

export function ChartBar({
  value,
  className,
  tooltip,
  minHeightPercent = 3,
  animationDelayMs,
  intensity,
  leftValue,
  rightValue,
}: ChartBarProps) {
  const fillOpacity = chartValueOpacity(intensity ?? value);
  const cast = chartBarNeighborCast(value, leftValue, rightValue);
  const depth = Math.round(value * 40);

  const bar = (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-t-sm outline-none ring-foreground/20 transition-all duration-300 hover:opacity-100 hover:shadow-[0_0_8px_rgba(94,106,210,0.45)]",
        "after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-white/20 after:content-['']",
        className,
      )}
      style={{
        height: `${Math.max(minHeightPercent, value * 100)}%`,
        opacity: fillOpacity,
        zIndex: depth,
        animationDelay: animationDelayMs !== undefined ? `${animationDelayMs}ms` : undefined,
      }}
      tabIndex={tooltip ? 0 : undefined}
    >
      <ChartBarCastOverlay side="left" strength={cast.left} />
      <ChartBarCastOverlay side="right" strength={cast.right} />
    </div>
  );

  if (!tooltip) return bar;

  return (
    <Tooltip>
      <TooltipTrigger render={bar} />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
