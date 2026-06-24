import type { CompareAdvancedAnalytics } from "@/lib/compare-advanced-analytics";
import { decimalFormatter } from "../formatters";
import { Metric } from "../metric";
import { AnalyticsPanel } from "../analytics-panel";
import { RankedRows } from "./shared";

export function CompareAdvancedPanel({ analytics }: { analytics: CompareAdvancedAnalytics }) {
  if (analytics.tasteDistance.length === 0) {
    return null;
  }

  return (
    <AnalyticsPanel
      title="Listener similarity"
      description="Compares artist overlap, session grouping, and discovery timing between listeners."
    >
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="Avg taste distance"
          value={decimalFormatter.format(analytics.averageTasteDistance)}
          help="How different listeners' artist mixes are. Lower = more similar."
        />
        <Metric
          label="Avg session overlap"
          value={decimalFormatter.format(analytics.averageGraphSimilarity)}
          help="How similarly listeners group artists within sessions."
        />
        <Metric
          label="Avg discovery coupling"
          value={decimalFormatter.format(analytics.averageDiscoveryCoupling)}
          help="Whether listeners discover new music in the same weeks. 1 = in sync, 0 = unrelated."
        />
      </div>
      <RankedRows
        label="Taste distance"
        help="Artist mix difference per pair. Lower = more alike."
        rows={analytics.tasteDistance.map((entry) => ({
          title: `${entry.left} ↔ ${entry.right}`,
          value: decimalFormatter.format(entry.value),
        }))}
      />
      <RankedRows
        label="Session overlap"
        help="Session grouping similarity per pair."
        rows={analytics.graphSimilarity.map((entry) => ({
          title: `${entry.left} ↔ ${entry.right}`,
          value: decimalFormatter.format(entry.value),
        }))}
      />
      <RankedRows
        label="Discovery coupling"
        help="Whether new-music weeks align per pair."
        rows={analytics.discoveryCoupling.map((entry) => ({
          title: `${entry.left} ↔ ${entry.right}`,
          value: decimalFormatter.format(entry.value),
        }))}
      />
    </AnalyticsPanel>
  );
}
