import type { CachedRecentTrack } from "@/lib/lastfm-stats-cache";

const PAUSE_GAP_FLOOR_SECONDS = 10 * 60;
const MIN_SESSION_GAP_SECONDS = 90 * 60;
const DEFAULT_SESSION_GAP_SECONDS = 2 * 60 * 60;
const MAX_SESSION_GAP_SECONDS = 6 * 60 * 60;
const MIN_PAUSE_SAMPLES = 8;

export const sortTracksChronologically = (tracks: CachedRecentTrack[]) =>
  [...tracks].sort(
    (left, right) =>
      left.playedAtTimestamp - right.playedAtTimestamp || left.id.localeCompare(right.id),
  );

export const resolveSessionGapSeconds = (tracks: CachedRecentTrack[]) => {
  const chronological = sortTracksChronologically(tracks);
  const pauseGaps: number[] = [];

  for (let index = 1; index < chronological.length; index += 1) {
    const gap =
      chronological[index]!.playedAtTimestamp - chronological[index - 1]!.playedAtTimestamp;

    if (gap >= PAUSE_GAP_FLOOR_SECONDS && gap <= MAX_SESSION_GAP_SECONDS) {
      pauseGaps.push(gap);
    }
  }

  if (pauseGaps.length < MIN_PAUSE_SAMPLES) {
    return DEFAULT_SESSION_GAP_SECONDS;
  }

  const adaptive = Math.round(median(pauseGaps) * 1.35);

  return Math.min(MAX_SESSION_GAP_SECONDS, Math.max(MIN_SESSION_GAP_SECONDS, adaptive));
};

export const splitListeningSessions = (
  tracks: CachedRecentTrack[],
  gapSeconds = resolveSessionGapSeconds(tracks),
): CachedRecentTrack[][] => {
  const chronological = sortTracksChronologically(tracks);
  const sessions: CachedRecentTrack[][] = [];
  let current: CachedRecentTrack[] = [];

  for (const track of chronological) {
    const previous = current.at(-1);

    if (
      previous &&
      previous.playedAtTimestamp > 0 &&
      track.playedAtTimestamp > 0 &&
      track.playedAtTimestamp - previous.playedAtTimestamp >= gapSeconds
    ) {
      sessions.push(current);
      current = [];
    }

    current.push(track);
  }

  if (current.length > 0) sessions.push(current);

  return sessions;
};

export const formatListeningSessionGap = (gapSeconds: number) => {
  if (gapSeconds >= 3_600) {
    const hours = gapSeconds / 3_600;
    const rounded = Math.round(hours * 10) / 10;

    return Number.isInteger(rounded) ? `${rounded} hours` : `${rounded} hours`;
  }

  return `${Math.round(gapSeconds / 60)} minutes`;
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }

  return sorted[middle] ?? 0;
};
