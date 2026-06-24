import type { AdvancedListeningAnalytics } from "@/lib/advanced-listening-analytics";
import type { LastFmStatsSnapshot } from "@/lib/lastfm-stats-cache";
import { artistKey } from "@/utils/track-keys";

export type ComparePairMetric = {
  left: string;
  right: string;
  value: number;
};

export type CompareAdvancedAnalytics = {
  tasteDistance: ComparePairMetric[];
  averageTasteDistance: number;
  graphSimilarity: ComparePairMetric[];
  averageGraphSimilarity: number;
  discoveryCoupling: ComparePairMetric[];
  averageDiscoveryCoupling: number;
};

export const createEmptyCompareAdvancedAnalytics = (): CompareAdvancedAnalytics => ({
  tasteDistance: [],
  averageTasteDistance: 0,
  graphSimilarity: [],
  averageGraphSimilarity: 0,
  discoveryCoupling: [],
  averageDiscoveryCoupling: 0,
});

export const deriveCompareAdvancedAnalytics = (
  snapshots: LastFmStatsSnapshot[],
): CompareAdvancedAnalytics => {
  if (snapshots.length < 2) return createEmptyCompareAdvancedAnalytics();

  const tasteDistance: ComparePairMetric[] = [];
  const graphSimilarity: ComparePairMetric[] = [];
  const discoveryCoupling: ComparePairMetric[] = [];

  for (let leftIndex = 0; leftIndex < snapshots.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < snapshots.length; rightIndex += 1) {
      const left = snapshots[leftIndex];
      const right = snapshots[rightIndex];

      if (!left || !right) continue;

      const leftAdvanced = left.derived.analytics.advanced;
      const rightAdvanced = right.derived.analytics.advanced;

      tasteDistance.push({
        left: left.username,
        right: right.username,
        value: wassersteinBetweenUsers(left, right),
      });

      graphSimilarity.push({
        left: left.username,
        right: right.username,
        value: graphSimilarityBetweenUsers(leftAdvanced, rightAdvanced),
      });

      discoveryCoupling.push({
        left: left.username,
        right: right.username,
        value: discoveryCouplingBetweenUsers(left, right),
      });
    }
  }

  return {
    tasteDistance,
    averageTasteDistance: average(tasteDistance.map((entry) => entry.value)),
    graphSimilarity,
    averageGraphSimilarity: average(graphSimilarity.map((entry) => entry.value)),
    discoveryCoupling,
    averageDiscoveryCoupling: average(discoveryCoupling.map((entry) => entry.value)),
  };
};

const wassersteinBetweenUsers = (left: LastFmStatsSnapshot, right: LastFmStatsSnapshot) => {
  const leftDist = buildArtistDistribution(left);
  const rightDist = buildArtistDistribution(right);
  const keys = [...new Set([...leftDist.keys(), ...rightDist.keys()])].sort();
  const leftValues = keys.map((key) => leftDist.get(key) ?? 0).sort((a, b) => a - b);
  const rightValues = keys.map((key) => rightDist.get(key) ?? 0).sort((a, b) => a - b);

  return (
    leftValues.reduce((sum, value, index) => sum + Math.abs(value - (rightValues[index] ?? 0)), 0) /
    Math.max(1, keys.length)
  );
};

const buildArtistDistribution = (snapshot: LastFmStatsSnapshot) => {
  const counts = new Map<string, number>();

  for (const track of snapshot.recentTracks) {
    const key = artistKey(track.artistName);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = snapshot.recentTracks.length || 1;

  return new Map([...counts.entries()].map(([key, count]) => [key, count / total]));
};

const graphSimilarityBetweenUsers = (
  left: AdvancedListeningAnalytics,
  right: AdvancedListeningAnalytics,
) => {
  const leftPairs = new Set(
    left.graph.topPmiPairs.map((pair) => `${pair.artist}::${pair.neighbor}`),
  );
  const rightPairs = new Set(
    right.graph.topPmiPairs.map((pair) => `${pair.artist}::${pair.neighbor}`),
  );
  const union = new Set([...leftPairs, ...rightPairs]).size || 1;
  const overlap = [...leftPairs].filter((pair) => rightPairs.has(pair)).length;

  return overlap / union;
};

const discoveryCouplingBetweenUsers = (left: LastFmStatsSnapshot, right: LastFmStatsSnapshot) => {
  const leftSeries = buildWeeklyDiscovery(left);
  const rightSeries = buildWeeklyDiscovery(right);
  const weeks = [...new Set([...leftSeries.keys(), ...rightSeries.keys()])].sort();
  const leftValues = weeks.map((week) => leftSeries.get(week) ?? 0);
  const rightValues = weeks.map((week) => rightSeries.get(week) ?? 0);

  return pearsonCorrelation(leftValues, rightValues);
};

const buildWeeklyDiscovery = (snapshot: LastFmStatsSnapshot) => {
  const weekly = new Map<string, number>();
  const seen = new Set<string>();

  for (const track of [...snapshot.recentTracks].sort(
    (a, b) => a.playedAtTimestamp - b.playedAtTimestamp,
  )) {
    const week = weekKey(track.playedAtTimestamp);
    const key = `${artistKey(track.artistName)}:${track.trackName}`;

    if (!seen.has(key)) {
      weekly.set(week, (weekly.get(week) ?? 0) + 1);
      seen.add(key);
    }
  }

  return weekly;
};

const weekKey = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - firstDay.getTime()) / 86_400_000);

  return `${date.getFullYear()}-W${String(Math.ceil((days + firstDay.getDay() + 1) / 7)).padStart(2, "0")}`;
};

const pearsonCorrelation = (left: number[], right: number[]) => {
  if (left.length < 2 || right.length < 2) return 0;

  const meanLeft = average(left);
  const meanRight = average(right);
  const numerator = left.reduce(
    (sum, value, index) => sum + (value - meanLeft) * ((right[index] ?? 0) - meanRight),
    0,
  );
  const denominator = Math.sqrt(
    left.reduce((sum, value) => sum + (value - meanLeft) ** 2, 0) *
      right.reduce((sum, value) => sum + (value - meanRight) ** 2, 0),
  );

  return denominator === 0 ? 0 : clamp(numerator / denominator, -1, 1);
};

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
