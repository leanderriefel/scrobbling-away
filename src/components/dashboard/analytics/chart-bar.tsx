import { cn } from "@/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

export function ChartBar({
  value,
  className,
  tooltip,
}: {
  value: number;
  className?: string;
  tooltip?: string;
}) {
  const bar = (
    <div
      className={cn("w-full rounded-t-sm outline-none ring-primary/30", className)}
      style={{ height: `${Math.max(3, value * 100)}%`, opacity: 0.35 + value * 0.65 }}
      tabIndex={tooltip ? 0 : undefined}
    />
  );

  if (!tooltip) return bar;

  return (
    <Tooltip>
      <TooltipTrigger render={bar} />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
