import type { AdvancedListeningAnalytics } from "@/lib/advanced-listening-analytics";
import { formatPercent } from "@/utils/format";

import { decimalFormatter } from "../formatters";
import { Metric } from "../metric";
import { AnalyticsPanel } from "../analytics-panel";
import { RankedRows } from "./shared";

export function GraphStructurePanel({
  analytics,
}: {
  analytics: AdvancedListeningAnalytics["graph"];
}) {
  return (
    <AnalyticsPanel
      title="Artists in the same session"
      description="Which artists show up together in sessions, which connect separate groups, and which pairs co-occur more than expected."
    >
      <Metric
        label="Group separation"
        value={formatPercent(analytics.modularity)}
        help="How clearly your listening splits into separate artist groups. Higher = more distinct groups."
      />
      <RankedRows
        label="Bridge artists"
        help="Artists that appear with many different groups."
        rows={analytics.bridgeArtists.map((artist) => ({
          title: artist,
          value: "—",
        }))}
      />
      <RankedRows
        label="Session groups"
        help="Artist clusters that tend to appear in the same sessions."
        rows={analytics.communities.map((community) => ({
          title: community.artists.join(", "),
          value: formatPercent(community.playShare),
        }))}
      />
      <RankedRows
        label="Strong pairs"
        help="Artist pairs that appear in the same session more often than expected."
        rows={analytics.topPmiPairs.map((pair) => ({
          title: `${pair.artist} + ${pair.neighbor}`,
          value: `${decimalFormatter.format(pair.pmi)} PMI`,
        }))}
      />
    </AnalyticsPanel>
  );
}
