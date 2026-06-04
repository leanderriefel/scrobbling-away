/** Minimum opacity for the smallest non-zero values (peak stays at 1). */
const CHART_OPACITY_MIN = 0.1;

/** Opacity for empty buckets. */
const CHART_OPACITY_ZERO = 0.06;

/** Exponent > 1 pushes low values darker / more faded. */
const CHART_OPACITY_CURVE = 1.85;

export const chartValueOpacity = (ratio: number): number => {
  const clamped = Math.max(0, Math.min(1, ratio));

  if (clamped <= 0) return CHART_OPACITY_ZERO;

  return CHART_OPACITY_MIN + clamped ** CHART_OPACITY_CURVE * (1 - CHART_OPACITY_MIN);
};

export const chartOpacityFromCount = (count: number, max: number): number =>
  chartValueOpacity(max > 0 ? count / max : 0);

/** Ignore only negligible gaps (~0.5% of the taller bar's height). */
const CAST_GAP_EPSILON = 0.005;

/** Higher = cast ramps up faster as the neighbor gets taller. */
const CAST_RAMP = 3.2;

/** Smooth 0–1 cast strength from height gap (no hard deadzone). */
const neighborShadowStrength = (self: number, neighbor: number): number => {
  const gap = neighbor - self;
  if (gap <= 0) return 0;

  const normalized = gap / Math.max(neighbor, 1e-6);
  if (normalized < CAST_GAP_EPSILON) return 0;

  return Math.min(1, (1 - Math.exp(-normalized * CAST_RAMP)) * 0.78);
};

export type ChartBarNeighborCast = {
  left: number;
  right: number;
};

/** 0–1 cast strength per side when a neighbor bar is taller. */
export const chartBarNeighborCast = (
  self: number,
  left?: number,
  right?: number,
): ChartBarNeighborCast => ({
  left: left === undefined ? 0 : neighborShadowStrength(self, left),
  right: right === undefined ? 0 : neighborShadowStrength(self, right),
});

const castShade = (percent: number) =>
  `color-mix(in oklab, var(--chart-cast) ${percent}%, transparent)`;

/** Side gradient overlay: darkens the bar face where a taller neighbor sits in front. */
export const chartBarCastGradient = (side: "left" | "right", strength: number): string => {
  const peak = 24 + strength * 38;
  const mid = 14 + strength * 22;
  const tail = 6 + strength * 12;

  if (side === "left") {
    return `linear-gradient(to right, ${castShade(peak)} 0%, ${castShade(mid)} 28%, ${castShade(tail)} 62%, transparent 100%)`;
  }

  return `linear-gradient(to left, ${castShade(peak)} 0%, ${castShade(mid)} 28%, ${castShade(tail)} 62%, transparent 100%)`;
};
