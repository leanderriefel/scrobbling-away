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
        "relative w-full overflow-hidden rounded-t-sm outline-none ring-foreground/20 transition-opacity duration-200 hover:opacity-100",
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
