import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { PlayHistoryPoint } from "@/lib/item-scrobble-stats";
import { formatCompact } from "@/utils/format";

import { SectionTitle } from "./section-title";

const chartConfig = {
  plays: {
    label: "Plays",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type PlayHistoryAreaChartProps = {
  points: PlayHistoryPoint[];
};

export const PlayHistoryAreaChart = ({ points }: PlayHistoryAreaChartProps) => {
  const gradientId = useId().replace(/:/g, "");

  const { chartData, peakMonth, rangeLabel, totalPlays } = useMemo(() => {
    const total = points.reduce((sum, point) => sum + point.count, 0);
    const peak = points.reduce<PlayHistoryPoint | null>(
      (best, point) => (point.count > (best?.count ?? 0) ? point : best),
      null,
    );

    return {
      chartData: points.map((point) => ({
        key: point.key,
        label: point.label,
        plays: point.count,
        tooltipLabel: point.tooltipLabel,
      })),
      peakMonth: peak,
      rangeLabel:
        points.length > 0
          ? `${points[0]?.tooltipLabel ?? ""} – ${points.at(-1)?.tooltipLabel ?? ""}`
          : "",
      totalPlays: total,
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="grid gap-3">
        <PlayHistoryHeader />
        <div className="py-8 text-center text-sm text-muted-foreground">No play history yet</div>
      </div>
    );
  }

  const tickInterval = Math.max(1, Math.floor(points.length / 6));

  return (
    <div className="grid gap-4">
      <PlayHistoryHeader />

      <ChartContainer
        config={chartConfig}
        className="aspect-5/2 w-full min-h-44 [&_.recharts-responsive-container]:overflow-visible [&_.recharts-surface]:overflow-visible"
        initialDimension={{ width: 640, height: 256 }}
      >
        <AreaChart
          accessibilityLayer
          data={chartData}
          margin={{ left: 20, right: 20, top: 8, bottom: 12 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-plays)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-plays)" stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} strokeDasharray="3 3" />

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={32}
            interval={tickInterval}
            padding={{ left: 16, right: 16 }}
            tick={{ fontSize: 11 }}
          />

          <YAxis
            hide
            domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
            allowDecimals={false}
          />

          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as { tooltipLabel?: string } | undefined;
                  return point?.tooltipLabel ?? "";
                }}
              />
            }
          />

          <Area
            dataKey="plays"
            type="monotone"
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            stroke="var(--color-plays)"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--color-plays)",
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ChartContainer>

      <div className="flex flex-wrap items-start justify-between gap-3 text-xs">
        <div className="grid gap-1">
          <p className="font-medium text-foreground">
            {formatCompact(totalPlays)} plays across {formatCompact(points.length)} months
          </p>
          <p className="text-muted-foreground">{rangeLabel}</p>
        </div>
        {peakMonth && peakMonth.count > 0 ? (
          <p className="font-mono text-muted-foreground tabular-nums">
            Peak · {peakMonth.tooltipLabel} · {formatCompact(peakMonth.count)}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const PlayHistoryHeader = () => (
  <SectionTitle
    variant="subsection"
    description="Monthly plays from account creation through today. Months before you listened to this item show as zero."
  >
    Play history
  </SectionTitle>
);
