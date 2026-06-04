import { deriveLastFmStats, type LastFmDerivedStatsInput } from "@/lib/lastfm-derived-stats";

self.addEventListener("message", (event: MessageEvent<LastFmDerivedStatsInput>) => {
  try {
    self.postMessage({
      ok: true,
      derived: deriveLastFmStats(event.data),
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to derive Last.fm stats.",
    });
  }
});
