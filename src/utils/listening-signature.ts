import type { LastFmStatsSnapshot, TimeBucket } from "@/lib/lastfm-stats-cache";
import { formatCompact } from "@/utils/format";

export type ListeningSignature = {
  averagePerDay: string;
  peakHour: string;
  peakWeekday: string;
  peakYear: string;
  repeatRate: number;
};

export const getListeningSignature = (snapshot: LastFmStatsSnapshot): ListeningSignature => {
  const cached = snapshot.counts.recentTracks;
  const uniqueTracks = snapshot.derived.uniqueTracks;
  const repeatRate = cached > 0 ? Math.max(0, 1 - uniqueTracks / cached) : 0;
  const first = snapshot.derived.firstScrobble?.playedAtTimestamp;
  const last = snapshot.derived.lastScrobble?.playedAtTimestamp;
  const days = first && last ? Math.max(1, Math.ceil((last - first) / 86_400)) : undefined;
  const averagePerDay = days ? formatCompact(cached / days) : "—";

  return {
    averagePerDay,
    peakHour: formatPeak(snapshot.derived.scrobblesByHour, (label) => `${label}:00`),
    peakWeekday: formatPeak(snapshot.derived.scrobblesByWeekday),
    peakYear: formatPeak(snapshot.derived.scrobblesByYear),
    repeatRate,
  };
};

const formatPeak = (
  buckets: TimeBucket[],
  labelFormat: (label: string) => string = (label) => label,
) => {
  const peak = buckets.reduce<TimeBucket | undefined>(
    (current, bucket) => (current === undefined || bucket.count > current.count ? bucket : current),
    undefined,
  );

  return peak ? `${labelFormat(peak.label)} (${formatCompact(peak.count)})` : "—";
};
