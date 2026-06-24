import type { CachedRecentTrack } from "@/lib/lastfm-stats-cache";
import {
  resolveSessionGapSeconds,
  sortTracksChronologically,
  splitListeningSessions,
} from "@/lib/listening-sessions";
import { buildSessionMarkovGraph, summarizeMarkovGraph } from "@/lib/markov-graph";
import {
  formatMonthKeyAnalytics,
  monthKeyFromTimestamp,
  monthRangeKeys,
} from "@/utils/account-timeline";
import { albumKey, artistKey, trackKey } from "@/utils/track-keys";
const DAY_SECONDS = 86_400;
const HAWKES_WINDOW_SECONDS = 30 * 60;
const TOP_TRACK_LIMIT = 25;
const MIN_PATTERN_COUNT = 3;

export type MarkovHubArtist = {
  label: string;
  inFlow: number;
  outFlow: number;
  hubScore: number;
};

export type MarkovTransition = {
  from: string;
  to: string;
  probability: number;
  count: number;
};

export type MarkovChainStats = {
  mixingSteps: number;
  stationaryDivergence: number;
  hubArtists: MarkovHubArtist[];
  topTransitions: MarkovTransition[];
};

export type ListeningMode = "explore" | "deep-dive" | "nostalgia" | "shuffle";

export type ListeningModeShare = {
  mode: ListeningMode;
  sessions: number;
  share: number;
};

export type ListeningModeTransition = {
  from: ListeningMode;
  to: ListeningMode;
  probability: number;
};

export type ListeningModeStats = {
  modes: ListeningModeShare[];
  topTransitions: ListeningModeTransition[];
  dominantMode: ListeningMode;
};

export type HawkesArtist = {
  label: string;
  avgFollowUps: number;
  lift: number;
  plays: number;
};

export type HawkesStats = {
  globalAvgFollowUps: number;
  contagiousArtists: HawkesArtist[];
};

export type SurvivalCurvePoint = {
  day: number;
  survival: number;
};

export type SurvivalStats = {
  medianDaysToRepeat: number;
  neverReplayedShare: number;
  curve: SurvivalCurvePoint[];
};

export type MultiScaleEntropy = {
  scale: number;
  entropy: number;
};

export type EntropyStats = {
  artistEntropy: number;
  dailyVolumeEntropy: MultiScaleEntropy[];
  dailyDiversityEntropy: MultiScaleEntropy[];
};

export type TransferEntropyStats = {
  discoveryToReplay: number;
  replayToDiscovery: number;
  dominantFlow: "discovery→replay" | "replay→discovery" | "balanced";
};

export type TasteDriftMonth = {
  label: string;
  distance: number;
};

export type TasteDriftStats = {
  averageMonthlyDistance: number;
  peakDistance: number;
  months: TasteDriftMonth[];
};

export type PmiNeighbor = {
  artist: string;
  neighbor: string;
  pmi: number;
};

export type GraphCommunity = {
  id: number;
  artists: string[];
  playShare: number;
};

export type GraphStructureStats = {
  modularity: number;
  bridgeArtists: string[];
  communities: GraphCommunity[];
  topPmiPairs: PmiNeighbor[];
};

export type SequentialPattern = {
  pattern: string[];
  occurrences: number;
  support: number;
  confidence: number;
  lift: number;
};

export type SequentialPatternStats = {
  topBigrams: SequentialPattern[];
  topTrigrams: SequentialPattern[];
};

export type RecurrenceStats = {
  recurrenceRate: number;
  determinism: number;
  laminarity: number;
};

export type ChangePoint = {
  label: string;
  metric: "volume" | "discovery" | "concentration";
  valueBefore: number;
  valueAfter: number;
};

export type ChangePointStats = {
  eras: ChangePoint[];
};

export type DecompositionPoint = {
  label: string;
  trend: number;
  seasonal: number;
  residual: number;
};

export type TimeSeriesDecompositionStats = {
  weeklySeasonalityStrength: number;
  trendDirection: "rising" | "falling" | "flat";
  points: DecompositionPoint[];
};

export type DfaStats = {
  hurstExponent: number;
  interpretation: "persistent" | "random" | "anti-persistent";
};

export type PacfLag = {
  lag: number;
  value: number;
};

export type PacfStats = {
  lags: PacfLag[];
  predictabilityScore: number;
  dominantLag?: number;
};

export type CohortRetentionPoint = {
  day: number;
  retention: number;
};

export type CohortRetention = {
  label: string;
  size: number;
  curve: CohortRetentionPoint[];
};

export type CohortRetentionStats = {
  cohorts: CohortRetention[];
  averageRetention90Days: number;
};

export type InterArrivalTrack = {
  label: string;
  detail: string;
  maxInSession: number;
  multiSessionCount: number;
  sessionReplayShare: number;
  plays: number;
};

export type InterArrivalStats = {
  averageSessionReplayShare: number;
  tracks: InterArrivalTrack[];
};

export type AlbumDecay = {
  label: string;
  detail: string;
  halfLifeDays: number;
  peakWeek: string;
  plays: number;
};

export type AlbumDecayStats = {
  averageHalfLifeDays: number;
  albums: AlbumDecay[];
};

export type AnomalousSession = {
  startedAt: number;
  durationMinutes: number;
  tracks: number;
  focus: number;
  score: number;
  reason: string;
};

export type AnomalyStats = {
  anomalousShare: number;
  sessions: AnomalousSession[];
};

export type CounterfactualStats = {
  actualGini: number;
  shuffledGini: number;
  orderEffect: number;
};

export type ErgodicityStats = {
  divergence: number;
  timeAverageTopArtistShare: number;
  sliceAverageTopArtistShare: number;
};

export type PhaseSpacePoint = {
  label: string;
  volume: number;
  diversity: number;
  discoveryRate: number;
  focus: number;
};

export type PhaseSpaceStats = {
  points: PhaseSpacePoint[];
  attractorStability: number;
};

export type AdvancedListeningAnalytics = {
  markov: MarkovChainStats;
  listeningModes: ListeningModeStats;
  hawkes: HawkesStats;
  survival: SurvivalStats;
  entropy: EntropyStats;
  transferEntropy: TransferEntropyStats;
  tasteDrift: TasteDriftStats;
  graph: GraphStructureStats;
  sequentialPatterns: SequentialPatternStats;
  recurrence: RecurrenceStats;
  changePoints: ChangePointStats;
  decomposition: TimeSeriesDecompositionStats;
  dfa: DfaStats;
  pacf: PacfStats;
  cohortRetention: CohortRetentionStats;
  interArrival: InterArrivalStats;
  albumDecay: AlbumDecayStats;
  anomalies: AnomalyStats;
  counterfactual: CounterfactualStats;
  ergodicity: ErgodicityStats;
  phaseSpace: PhaseSpaceStats;
};

export const createEmptyAdvancedListeningAnalytics = (): AdvancedListeningAnalytics => ({
  markov: {
    mixingSteps: 0,
    stationaryDivergence: 0,
    hubArtists: [],
    topTransitions: [],
  },
  listeningModes: {
    modes: [],
    topTransitions: [],
    dominantMode: "shuffle",
  },
  hawkes: { globalAvgFollowUps: 0, contagiousArtists: [] },
  survival: { medianDaysToRepeat: 0, neverReplayedShare: 0, curve: [] },
  entropy: { artistEntropy: 0, dailyVolumeEntropy: [], dailyDiversityEntropy: [] },
  transferEntropy: {
    discoveryToReplay: 0,
    replayToDiscovery: 0,
    dominantFlow: "balanced",
  },
  tasteDrift: { averageMonthlyDistance: 0, peakDistance: 0, months: [] },
  graph: { modularity: 0, bridgeArtists: [], communities: [], topPmiPairs: [] },
  sequentialPatterns: { topBigrams: [], topTrigrams: [] },
  recurrence: { recurrenceRate: 0, determinism: 0, laminarity: 0 },
  changePoints: { eras: [] },
  decomposition: { weeklySeasonalityStrength: 0, trendDirection: "flat", points: [] },
  dfa: { hurstExponent: 0.5, interpretation: "random" },
  pacf: { lags: [], predictabilityScore: 0 },
  cohortRetention: { cohorts: [], averageRetention90Days: 0 },
  interArrival: { averageSessionReplayShare: 0, tracks: [] },
  albumDecay: { averageHalfLifeDays: 0, albums: [] },
  anomalies: { anomalousShare: 0, sessions: [] },
  counterfactual: { actualGini: 0, shuffledGini: 0, orderEffect: 0 },
  ergodicity: { divergence: 0, timeAverageTopArtistShare: 0, sliceAverageTopArtistShare: 0 },
  phaseSpace: { points: [], attractorStability: 0 },
});

export const deriveAdvancedListeningAnalytics = (
  tracks: CachedRecentTrack[],
  timelineStart?: number,
): AdvancedListeningAnalytics => {
  if (tracks.length === 0) return createEmptyAdvancedListeningAnalytics();

  const chronological = sortTracksChronologically(tracks);
  const sessionGapSeconds = resolveSessionGapSeconds(chronological);
  const sessions = splitListeningSessions(chronological, sessionGapSeconds);
  const dailySeries = buildDailySeries(chronological);
  const artistCounts = countByArtist(chronological);
  const artistLabels = new Map(
    chronological.map((track) => [artistKey(track.artistName), track.artistName]),
  );

  return {
    markov: summarizeMarkovGraph(buildSessionMarkovGraph(chronological)),
    listeningModes: deriveListeningModes(sessions),
    hawkes: deriveHawkes(sessions, artistLabels),
    survival: deriveSurvival(chronological),
    entropy: deriveEntropy(chronological, dailySeries),
    transferEntropy: deriveTransferEntropy(chronological),
    tasteDrift: deriveTasteDrift(chronological, timelineStart),
    graph: deriveGraphStructure(sessions, artistCounts, chronological),
    sequentialPatterns: deriveSequentialPatterns(sessions, artistLabels),
    recurrence: deriveRecurrence(dailySeries),
    changePoints: deriveChangePoints(chronological, timelineStart),
    decomposition: deriveDecomposition(dailySeries),
    dfa: deriveDfa(dailySeries.map((day) => day.volume)),
    pacf: derivePacf(dailySeries.map((day) => day.volume)),
    cohortRetention: deriveCohortRetention(chronological, timelineStart),
    interArrival: deriveInterArrival(sessions),
    albumDecay: deriveAlbumDecay(chronological),
    anomalies: deriveAnomalies(sessions),
    counterfactual: deriveCounterfactual(sessions),
    ergodicity: deriveErgodicity(chronological, artistCounts),
    phaseSpace: derivePhaseSpace(dailySeries, sessions),
  };
};

type DailyPoint = {
  key: string;
  label: string;
  volume: number;
  uniqueArtists: number;
  discoveryRate: number;
  focus: number;
};

type SessionFeatures = {
  tracks: CachedRecentTrack[];
  durationMinutes: number;
  focus: number;
  artistEntropy: number;
  discoveryRate: number;
  repeatRate: number;
};

const buildDailySeries = (tracks: CachedRecentTrack[]): DailyPoint[] => {
  const days = new Map<string, CachedRecentTrack[]>();

  for (const track of tracks) {
    const key = dayKey(track.playedAtTimestamp);
    const bucket = days.get(key) ?? [];

    bucket.push(track);
    days.set(key, bucket);
  }

  const seenTracks = new Set<string>();

  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, dayTracks]) => {
      let newPlays = 0;

      for (const track of dayTracks) {
        const keyPart = trackKey(track.artistName, track.trackName);

        if (!seenTracks.has(keyPart)) {
          newPlays += 1;
          seenTracks.add(keyPart);
        }
      }

      const artistCounts = countByArtist(dayTracks);
      const topArtist = Math.max(0, ...artistCounts.values());

      return {
        key,
        label: formatDayLabel(key),
        volume: dayTracks.length,
        uniqueArtists: artistCounts.size,
        discoveryRate: dayTracks.length > 0 ? newPlays / dayTracks.length : 0,
        focus: dayTracks.length > 0 ? topArtist / dayTracks.length : 0,
      };
    });
};

const deriveListeningModes = (sessions: CachedRecentTrack[][]): ListeningModeStats => {
  const features = sessions.map(sessionFeatures);
  const modes = features.map(classifySessionMode);
  const counts = new Map<ListeningMode, number>();

  for (const mode of modes) {
    counts.set(mode, (counts.get(mode) ?? 0) + 1);
  }

  const total = modes.length || 1;
  const modeShares: ListeningModeShare[] = (
    ["explore", "deep-dive", "nostalgia", "shuffle"] as const
  ).map((mode) => ({
    mode,
    sessions: counts.get(mode) ?? 0,
    share: (counts.get(mode) ?? 0) / total,
  }));

  const transitionCounts = new Map<string, number>();

  for (let index = 1; index < modes.length; index += 1) {
    const from = modes[index - 1];
    const to = modes[index];

    if (!from || !to) continue;

    const key = `${from}->${to}`;
    transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1);
  }

  const fromTotals = new Map<ListeningMode, number>();

  for (const [key, count] of transitionCounts.entries()) {
    const from = key.split("->")[0] as ListeningMode;
    fromTotals.set(from, (fromTotals.get(from) ?? 0) + count);
  }

  const topTransitions = [...transitionCounts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("->") as [ListeningMode, ListeningMode];
      const totalFrom = fromTotals.get(from) ?? 1;

      return { from, to, probability: count / totalFrom };
    })
    .sort((left, right) => right.probability - left.probability)
    .slice(0, 4);

  const dominantMode =
    modeShares.sort((left, right) => right.share - left.share)[0]?.mode ?? "shuffle";

  return { modes: modeShares, topTransitions, dominantMode };
};

const deriveHawkes = (
  sessions: CachedRecentTrack[][],
  artistLabels: Map<string, string>,
): HawkesStats => {
  let totalFollowUps = 0;
  let totalPlays = 0;
  const artistFollowUps = new Map<string, number>();
  const artistPlays = new Map<string, number>();

  for (const session of sessions) {
    for (let index = 0; index < session.length; index += 1) {
      const current = session[index];

      if (!current) continue;

      const key = artistKey(current.artistName);

      if (!key) continue;

      const currentTime = current.playedAtTimestamp;
      let followUpCount = 0;

      for (let nextIndex = index + 1; nextIndex < session.length; nextIndex += 1) {
        const next = session[nextIndex];

        if (!next) continue;

        const gap = next.playedAtTimestamp - currentTime;

        if (gap <= 0) continue;
        if (gap > HAWKES_WINDOW_SECONDS) break;

        followUpCount += 1;
      }

      totalFollowUps += followUpCount;
      totalPlays += 1;
      artistFollowUps.set(key, (artistFollowUps.get(key) ?? 0) + followUpCount);
      artistPlays.set(key, (artistPlays.get(key) ?? 0) + 1);
    }
  }

  const globalAvgFollowUps = totalPlays > 0 ? totalFollowUps / totalPlays : 0;

  const contagiousArtists = [...artistPlays.entries()]
    .map(([key, plays]) => {
      const followUps = artistFollowUps.get(key) ?? 0;
      const avgFollowUps = followUps / plays;
      const lift = globalAvgFollowUps > 0 ? avgFollowUps / globalAvgFollowUps : 0;

      return {
        label: artistLabels.get(key) ?? key,
        avgFollowUps,
        lift,
        plays,
      };
    })
    .filter((artist) => artist.plays >= 8)
    .sort((left, right) => {
      if (right.lift !== left.lift) return right.lift - left.lift;

      return right.avgFollowUps - left.avgFollowUps;
    })
    .slice(0, 5);

  return {
    globalAvgFollowUps,
    contagiousArtists,
  };
};

const deriveSurvival = (tracks: CachedRecentTrack[]): SurvivalStats => {
  const firstPlay = new Map<string, number>();
  const secondPlay = new Map<string, number>();

  for (const track of tracks) {
    const key = trackKey(track.artistName, track.trackName);
    const timestamp = track.playedAtTimestamp;

    if (!firstPlay.has(key)) {
      firstPlay.set(key, timestamp);
      continue;
    }

    if (!secondPlay.has(key)) {
      secondPlay.set(key, timestamp);
    }
  }

  const delays = [...secondPlay.entries()].map(([key, second]) => {
    const first = firstPlay.get(key) ?? second;
    return (second - first) / DAY_SECONDS;
  });

  const neverReplayed = [...firstPlay.keys()].filter((key) => !secondPlay.has(key)).length;
  const totalTracks = firstPlay.size || 1;
  const curve = buildKaplanMeier(delays, 90);

  return {
    medianDaysToRepeat: median(delays),
    neverReplayedShare: neverReplayed / totalTracks,
    curve,
  };
};

const deriveEntropy = (tracks: CachedRecentTrack[], dailySeries: DailyPoint[]): EntropyStats => {
  const artistCounts = countByArtist(tracks);
  const counts = [...artistCounts.values()];
  const total = counts.reduce((sum, count) => sum + count, 0);

  return {
    artistEntropy: shannonEntropy(counts, total),
    dailyVolumeEntropy: multiScaleEntropy(dailySeries.map((day) => day.volume)),
    dailyDiversityEntropy: multiScaleEntropy(dailySeries.map((day) => day.uniqueArtists)),
  };
};

const deriveTransferEntropy = (tracks: CachedRecentTrack[]): TransferEntropyStats => {
  const weeklyDiscovery = new Map<string, number>();
  const weeklyReplay = new Map<string, number>();
  const seen = new Set<string>();

  for (const track of tracks) {
    const week = weekKey(track.playedAtTimestamp);
    const key = trackKey(track.artistName, track.trackName);
    const isNew = !seen.has(key);

    if (isNew) {
      weeklyDiscovery.set(week, (weeklyDiscovery.get(week) ?? 0) + 1);
      seen.add(key);
    } else {
      weeklyReplay.set(week, (weeklyReplay.get(week) ?? 0) + 1);
    }
  }

  const weeks = [...new Set([...weeklyDiscovery.keys(), ...weeklyReplay.keys()])].sort();
  const discoveryShare = weeks.map((week) => {
    const discovery = weeklyDiscovery.get(week) ?? 0;
    const replay = weeklyReplay.get(week) ?? 0;
    const total = discovery + replay;

    return total > 0 ? discovery / total : 0;
  });
  const replayShare = weeks.map((week) => {
    const discovery = weeklyDiscovery.get(week) ?? 0;
    const replay = weeklyReplay.get(week) ?? 0;
    const total = discovery + replay;

    return total > 0 ? replay / total : 0;
  });
  const discoveryToReplay = laggedCorrelation(discoveryShare, replayShare, 1);
  const replayToDiscovery = laggedCorrelation(replayShare, discoveryShare, 1);

  let dominantFlow: TransferEntropyStats["dominantFlow"] = "balanced";

  if (discoveryToReplay > replayToDiscovery + 0.12 && discoveryToReplay >= 0.12) {
    dominantFlow = "discovery→replay";
  }

  if (replayToDiscovery > discoveryToReplay + 0.12 && replayToDiscovery >= 0.12) {
    dominantFlow = "replay→discovery";
  }

  return { discoveryToReplay, replayToDiscovery, dominantFlow };
};

const deriveTasteDrift = (tracks: CachedRecentTrack[], timelineStart?: number): TasteDriftStats => {
  const start = timelineStart ?? tracks[0]?.playedAtTimestamp ?? 0;
  const months = monthRangeKeys(start, tracks.at(-1)?.playedAtTimestamp ?? start);
  const distributions = months.map((month) => {
    const monthTracks = tracks.filter(
      (track) => monthKeyFromTimestamp(track.playedAtTimestamp) === month,
    );
    return countByArtist(monthTracks);
  });

  const distances: TasteDriftMonth[] = [];

  for (let index = 1; index < distributions.length; index += 1) {
    const distance = totalVariationDistance(
      distributions[index - 1] ?? new Map(),
      distributions[index] ?? new Map(),
    );

    distances.push({
      label: formatMonthKeyAnalytics(months[index] ?? ""),
      distance,
    });
  }

  const values = distances.map((entry) => entry.distance);

  return {
    averageMonthlyDistance: average(values),
    peakDistance: Math.max(0, ...values),
    months: distances.slice(-18),
  };
};

const deriveGraphStructure = (
  sessions: CachedRecentTrack[][],
  artistCounts: Map<string, number>,
  tracks: CachedRecentTrack[],
): GraphStructureStats => {
  const coOccurrence = new Map<string, Map<string, number>>();
  const artistTotals = new Map<string, number>();

  for (const session of sessions) {
    const artists = [...new Set(session.map((track) => artistKey(track.artistName)))];

    for (const artist of artists) {
      artistTotals.set(artist, (artistTotals.get(artist) ?? 0) + 1);
    }

    for (let left = 0; left < artists.length; left += 1) {
      for (let right = left + 1; right < artists.length; right += 1) {
        const a = artists[left];
        const b = artists[right];

        if (!a || !b) continue;

        incrementPair(coOccurrence, a, b);
        incrementPair(coOccurrence, b, a);
      }
    }
  }

  const labels = new Map(tracks.map((track) => [artistKey(track.artistName), track.artistName]));
  const topPmiPairs = buildTopPmiPairs(coOccurrence, artistTotals, labels, tracks.length);
  const communities = detectCommunities(coOccurrence, labels, artistCounts, tracks.length);
  const bridgeArtists = findBridgeArtists(coOccurrence, labels).slice(0, 5);
  const modularity = estimateModularity(coOccurrence, communities);

  return { modularity, bridgeArtists, communities, topPmiPairs };
};

const deriveSequentialPatterns = (
  sessions: CachedRecentTrack[][],
  artistLabels: Map<string, string>,
): SequentialPatternStats => {
  return {
    topBigrams: minePatterns(sessions, 2, artistLabels),
    topTrigrams: minePatterns(sessions, 3, artistLabels),
  };
};

const deriveRecurrence = (dailySeries: DailyPoint[]): RecurrenceStats => {
  const vectors = dailySeries.map((day) => [day.volume, day.uniqueArtists, day.discoveryRate]);
  const threshold = 0.15;

  if (vectors.length < 4) {
    return { recurrenceRate: 0, determinism: 0, laminarity: 0 };
  }

  let recurrencePoints = 0;
  let diagonalPoints = 0;
  let verticalPoints = 0;
  const total = vectors.length * vectors.length;

  for (let row = 0; row < vectors.length; row += 1) {
    for (let col = 0; col < vectors.length; col += 1) {
      const left = vectors[row];
      const right = vectors[col];

      if (!left || !right) continue;

      const distance = Math.sqrt(
        left.reduce((sum, value, index) => sum + (value - (right[index] ?? 0)) ** 2, 0) /
          left.length,
      );
      const normalized =
        distance /
        Math.max(
          1,
          Math.sqrt(
            vectors.reduce((max, vector) => Math.max(max, vector[0] ?? 0), 0) ** 2 +
              vectors.reduce((max, vector) => Math.max(max, vector[1] ?? 0), 0) ** 2,
          ),
        );

      if (normalized <= threshold) {
        recurrencePoints += 1;

        if (row !== col && Math.abs(row - col) <= 2) diagonalPoints += 1;
        if (row !== col && row > col) verticalPoints += 1;
      }
    }
  }

  return {
    recurrenceRate: recurrencePoints / total,
    determinism: recurrencePoints > 0 ? diagonalPoints / recurrencePoints : 0,
    laminarity: recurrencePoints > 0 ? verticalPoints / recurrencePoints : 0,
  };
};

const deriveChangePoints = (
  tracks: CachedRecentTrack[],
  timelineStart?: number,
): ChangePointStats => {
  const start = timelineStart ?? tracks[0]?.playedAtTimestamp ?? 0;
  const months = monthRangeKeys(start, tracks.at(-1)?.playedAtTimestamp ?? start);
  const metrics = months.map((month) => {
    const monthTracks = tracks.filter(
      (track) => monthKeyFromTimestamp(track.playedAtTimestamp) === month,
    );
    const seen = new Set<string>();
    let newPlays = 0;

    for (const track of monthTracks) {
      const key = trackKey(track.artistName, track.trackName);

      if (!seen.has(key)) {
        newPlays += 1;
        seen.add(key);
      }
    }

    const counts = [...countByArtist(monthTracks).values()].sort((left, right) => right - left);
    const total = counts.reduce((sum, count) => sum + count, 0);

    return {
      label: formatMonthKeyAnalytics(month),
      volume: monthTracks.length,
      discovery: monthTracks.length > 0 ? newPlays / monthTracks.length : 0,
      concentration: calculateGini(counts, total),
    };
  });

  const eras: ChangePoint[] = [];

  for (const metric of ["volume", "discovery", "concentration"] as const) {
    const values = metrics.map((entry) => entry[metric]);
    const index = findChangePoint(values);

    if (index <= 0 || index >= metrics.length - 1) continue;

    eras.push({
      label: metrics[index]?.label ?? "",
      metric,
      valueBefore: metrics[index - 1]?.[metric] ?? 0,
      valueAfter: metrics[index]?.[metric] ?? 0,
    });
  }

  return { eras: eras.slice(0, 4) };
};

const deriveDecomposition = (dailySeries: DailyPoint[]): TimeSeriesDecompositionStats => {
  const values = dailySeries.map((day) => day.volume);

  if (values.length < 14) {
    return { weeklySeasonalityStrength: 0, trendDirection: "flat", points: [] };
  }

  const trendWindow = 7;
  const points = dailySeries.map((day, index) => {
    const start = Math.max(0, index - trendWindow + 1);
    const slice = values.slice(start, index + 1);
    const trend = average(slice);
    const seasonal = values[index]! - trend;
    const residual = values[index]! - trend - seasonal * 0.5;

    return {
      label: day.label,
      trend,
      seasonal,
      residual,
    };
  });

  const seasonalStrength =
    variance(points.map((point) => point.seasonal)) / Math.max(1e-6, variance(values));
  const firstTrend = average(points.slice(0, 7).map((point) => point.trend));
  const lastTrend = average(points.slice(-7).map((point) => point.trend));
  const delta = lastTrend - firstTrend;
  const trendDirection =
    delta > firstTrend * 0.1 ? "rising" : delta < -firstTrend * 0.1 ? "falling" : "flat";

  return {
    weeklySeasonalityStrength: clamp01(seasonalStrength),
    trendDirection,
    points: points.slice(-28),
  };
};

const deriveDfa = (values: number[]): DfaStats => {
  if (values.length < 16) {
    return { hurstExponent: 0.5, interpretation: "random" };
  }

  const profile = cumulativeSum(values.map((value) => value - average(values)));
  const scales = [4, 8, 16, 32].filter((scale) => scale < profile.length / 2);
  const fluctuations: Array<{ scale: number; value: number }> = [];

  for (const scale of scales) {
    const segments = Math.floor(profile.length / scale);
    let total = 0;

    for (let segment = 0; segment < segments; segment += 1) {
      const slice = profile.slice(segment * scale, (segment + 1) * scale);
      const slope = linearSlope(
        slice.map((_, index) => index),
        slice,
      );
      const intercept = average(slice) - slope * average(slice.map((_, index) => index));
      const detrended = slice.map((value, index) => value - (slope * index + intercept));
      total += Math.sqrt(detrended.reduce((sum, value) => sum + value ** 2, 0) / detrended.length);
    }

    fluctuations.push({ scale, value: total / segments });
  }

  if (fluctuations.length < 2) {
    return { hurstExponent: 0.5, interpretation: "random" };
  }

  const hurstExponent = clamp(
    linearSlope(
      fluctuations.map((entry) => Math.log(entry.scale)),
      fluctuations.map((entry) => Math.log(entry.value)),
    ),
    0.1,
    0.9,
  );

  const interpretation =
    hurstExponent > 0.55 ? "persistent" : hurstExponent < 0.45 ? "anti-persistent" : "random";

  return { hurstExponent, interpretation };
};

const derivePacf = (values: number[]): PacfStats => {
  const maxLag = Math.min(14, Math.floor(values.length / 3));

  if (maxLag < 2) {
    return { lags: [], predictabilityScore: 0 };
  }

  const lags: PacfLag[] = [];

  for (let lag = 1; lag <= maxLag; lag += 1) {
    lags.push({ lag, value: partialAutocorrelation(values, lag) });
  }

  const dominantLag = lags
    .filter((entry) => entry.lag > 0)
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))[0]?.lag;
  const predictabilityScore = clamp01(
    lags.reduce((sum, entry) => sum + Math.abs(entry.value), 0) / lags.length,
  );

  return { lags, predictabilityScore, dominantLag };
};

const deriveCohortRetention = (
  tracks: CachedRecentTrack[],
  timelineStart?: number,
): CohortRetentionStats => {
  const start = timelineStart ?? tracks[0]?.playedAtTimestamp ?? 0;
  const months = monthRangeKeys(start, tracks.at(-1)?.playedAtTimestamp ?? start).slice(-8);
  const firstPlay = new Map<string, number>();
  const playsByArtist = new Map<string, number[]>();

  for (const track of tracks) {
    const key = artistKey(track.artistName);
    const plays = playsByArtist.get(key) ?? [];

    plays.push(track.playedAtTimestamp);
    playsByArtist.set(key, plays);

    if (!firstPlay.has(key)) {
      firstPlay.set(key, track.playedAtTimestamp);
    }
  }

  const cohorts = months.map((month) => {
    const monthStart = monthToTimestamp(month);
    const monthEnd = monthToTimestamp(nextMonth(month));
    const members = [...firstPlay.entries()]
      .filter(([, timestamp]) => timestamp >= monthStart && timestamp < monthEnd)
      .map(([artist]) => artist);

    const curve = [30, 90, 180].map((day) => {
      const retained = members.filter((artist) => {
        const plays = playsByArtist.get(artist) ?? [];
        const first = firstPlay.get(artist) ?? 0;
        const horizon = first + day * DAY_SECONDS;

        return plays.some((timestamp) => timestamp > first + DAY_SECONDS && timestamp <= horizon);
      }).length;

      return {
        day,
        retention: members.length > 0 ? retained / members.length : 0,
      };
    });

    return {
      label: formatMonthKeyAnalytics(month),
      size: members.length,
      curve,
    };
  });

  const averageRetention90Days = average(
    cohorts.map((cohort) => cohort.curve.find((point) => point.day === 90)?.retention ?? 0),
  );

  return { cohorts, averageRetention90Days };
};

const deriveInterArrival = (sessions: CachedRecentTrack[][]): InterArrivalStats => {
  const playsByTrack = new Map<
    string,
    {
      label: string;
      detail: string;
      plays: number;
      sessionReplayPlays: number;
      maxInSession: number;
      multiSessionCount: number;
    }
  >();

  for (const session of sessions) {
    const countsInSession = new Map<string, number>();
    const labelsInSession = new Map<string, { label: string; detail: string }>();

    for (const track of session) {
      const key = trackKey(track.artistName, track.trackName);

      countsInSession.set(key, (countsInSession.get(key) ?? 0) + 1);
      labelsInSession.set(key, { label: track.trackName, detail: track.artistName });
    }

    for (const [key, count] of countsInSession.entries()) {
      const labels = labelsInSession.get(key);

      if (!labels) continue;

      const current = playsByTrack.get(key) ?? {
        label: labels.label,
        detail: labels.detail,
        plays: 0,
        sessionReplayPlays: 0,
        maxInSession: 0,
        multiSessionCount: 0,
      };

      current.plays += count;
      current.sessionReplayPlays += Math.max(0, count - 1);
      current.maxInSession = Math.max(current.maxInSession, count);

      if (count >= 2) {
        current.multiSessionCount += 1;
      }

      playsByTrack.set(key, current);
    }
  }

  const tracksStats = [...playsByTrack.values()]
    .filter((entry) => entry.plays >= 4 && entry.sessionReplayPlays >= 2)
    .map((entry) => ({
      label: entry.label,
      detail: entry.detail,
      maxInSession: entry.maxInSession,
      multiSessionCount: entry.multiSessionCount,
      sessionReplayShare: entry.sessionReplayPlays / entry.plays,
      plays: entry.plays,
    }))
    .sort((left, right) => {
      if (right.maxInSession !== left.maxInSession) {
        return right.maxInSession - left.maxInSession;
      }

      if (right.multiSessionCount !== left.multiSessionCount) {
        return right.multiSessionCount - left.multiSessionCount;
      }

      return right.sessionReplayShare - left.sessionReplayShare;
    })
    .slice(0, TOP_TRACK_LIMIT);

  return {
    averageSessionReplayShare: average(tracksStats.map((track) => track.sessionReplayShare)),
    tracks: tracksStats,
  };
};

const deriveAlbumDecay = (tracks: CachedRecentTrack[]): AlbumDecayStats => {
  const albums = new Map<
    string,
    { label: string; detail: string; weeks: Map<string, number>; plays: number }
  >();

  for (const track of tracks) {
    if (!track.albumName) continue;

    const key = albumKey(track.artistName, track.albumName);
    const week = weekKey(track.playedAtTimestamp);
    const current = albums.get(key) ?? {
      label: track.albumName,
      detail: track.artistName,
      weeks: new Map<string, number>(),
      plays: 0,
    };

    current.weeks.set(week, (current.weeks.get(week) ?? 0) + 1);
    current.plays += 1;
    albums.set(key, current);
  }

  const albumStats = [...albums.values()]
    .filter((album) => album.plays >= 8)
    .map((album) => {
      const peakWeek = [...album.weeks.entries()].sort((left, right) => right[1] - left[1])[0];
      const peakCount = peakWeek?.[1] ?? 1;
      const halfLifeDays = estimateHalfLife(album.weeks, peakWeek?.[0] ?? "", peakCount);

      return {
        label: album.label,
        detail: album.detail,
        halfLifeDays,
        peakWeek: peakWeek?.[0] ?? "",
        plays: album.plays,
      };
    })
    .sort((left, right) => left.halfLifeDays - right.halfLifeDays)
    .slice(0, 8);

  return {
    averageHalfLifeDays: average(albumStats.map((album) => album.halfLifeDays)),
    albums: albumStats,
  };
};

const deriveAnomalies = (sessions: CachedRecentTrack[][]): AnomalyStats => {
  const features = sessions.map(sessionFeatures);
  const vectors = features.map((feature) => [
    feature.durationMinutes,
    feature.tracks.length,
    feature.focus,
    feature.artistEntropy,
    feature.discoveryRate,
    feature.repeatRate,
  ]);

  const means =
    vectors[0]?.map((_, index) => average(vectors.map((vector) => vector[index] ?? 0))) ?? [];
  const stds = means.map((_, index) =>
    Math.sqrt(variance(vectors.map((vector) => vector[index] ?? 0))),
  );

  const scored = features.map((feature, index) => {
    const vector = vectors[index] ?? [];
    const score = Math.sqrt(
      vector.reduce((sum, value, vectorIndex) => {
        const std = stds[vectorIndex] ?? 1;
        const mean = means[vectorIndex] ?? 0;
        const z = std > 0 ? (value - mean) / std : 0;

        return sum + z ** 2;
      }, 0) / Math.max(1, vector.length),
    );

    return {
      startedAt: feature.tracks[0]?.playedAtTimestamp ?? 0,
      durationMinutes: feature.durationMinutes,
      tracks: feature.tracks.length,
      focus: feature.focus,
      score,
      reason: describeAnomaly(feature, means),
    };
  });

  const threshold = 2.2;
  const anomalous = scored.filter((session) => session.score >= threshold);

  return {
    anomalousShare: sessions.length > 0 ? anomalous.length / sessions.length : 0,
    sessions: anomalous.sort((left, right) => right.score - left.score).slice(0, 5),
  };
};

const deriveCounterfactual = (sessions: CachedRecentTrack[][]): CounterfactualStats => {
  let actualWeighted = 0;
  let shuffledWeighted = 0;
  let totalPlays = 0;

  for (const session of sessions) {
    if (session.length === 0) continue;

    const weight = session.length;
    totalPlays += weight;
    actualWeighted += sessionBurstConcentration(session) * weight;
    shuffledWeighted += sessionBurstConcentration(interleaveSession(session)) * weight;
  }

  const actualGini = totalPlays > 0 ? actualWeighted / totalPlays : 0;
  const shuffledGini = totalPlays > 0 ? shuffledWeighted / totalPlays : 0;

  return {
    actualGini,
    shuffledGini,
    orderEffect: actualGini - shuffledGini,
  };
};

const sessionBurstConcentration = (session: CachedRecentTrack[]) => {
  if (session.length <= 1) return 1;

  const runs: number[] = [];
  let currentRun = 1;

  for (let index = 1; index < session.length; index += 1) {
    const previous = artistKey(session[index - 1]?.artistName ?? "");
    const current = artistKey(session[index]?.artistName ?? "");

    if (current === previous) {
      currentRun += 1;
      continue;
    }

    runs.push(currentRun);
    currentRun = 1;
  }

  runs.push(currentRun);

  const total = session.length;

  return runs.reduce((sum, length) => sum + (length / total) ** 2, 0);
};

const interleaveSession = (session: CachedRecentTrack[]) => {
  const queues = [...groupSessionTracksByArtist(session).values()].sort(
    (left, right) => right.length - left.length,
  );
  const interleaved: CachedRecentTrack[] = [];

  while (interleaved.length < session.length) {
    for (const queue of queues) {
      const next = queue.shift();

      if (next) interleaved.push(next);
    }
  }

  return interleaved;
};

const groupSessionTracksByArtist = (session: CachedRecentTrack[]) => {
  const queues = new Map<string, CachedRecentTrack[]>();

  for (const track of session) {
    const key = artistKey(track.artistName);
    const bucket = queues.get(key) ?? [];

    bucket.push(track);
    queues.set(key, bucket);
  }

  return queues;
};

const deriveErgodicity = (
  tracks: CachedRecentTrack[],
  artistCounts: Map<string, number>,
): ErgodicityStats => {
  const total = tracks.length || 1;
  const sorted = [...artistCounts.entries()].sort((left, right) => right[1] - left[1]);
  const timeAverageTopArtistShare = (sorted[0]?.[1] ?? 0) / total;

  const months = new Map<string, CachedRecentTrack[]>();

  for (const track of tracks) {
    const month = monthKeyFromTimestamp(track.playedAtTimestamp);
    const bucket = months.get(month) ?? [];

    bucket.push(track);
    months.set(month, bucket);
  }

  const sliceShares = [...months.values()].map((monthTracks) => {
    const counts = countByArtist(monthTracks);
    const top = Math.max(0, ...counts.values());

    return top / Math.max(1, monthTracks.length);
  });

  const sliceAverageTopArtistShare = average(sliceShares);

  return {
    divergence: Math.abs(timeAverageTopArtistShare - sliceAverageTopArtistShare),
    timeAverageTopArtistShare,
    sliceAverageTopArtistShare,
  };
};

const derivePhaseSpace = (
  dailySeries: DailyPoint[],
  sessions: CachedRecentTrack[][],
): PhaseSpaceStats => {
  const sessionByDay = new Map<string, SessionFeatures[]>();

  for (const session of sessions) {
    const key = dayKey(session[0]?.playedAtTimestamp ?? 0);
    const bucket = sessionByDay.get(key) ?? [];

    bucket.push(sessionFeatures(session));
    sessionByDay.set(key, bucket);
  }

  const points = dailySeries.slice(-40).map((day) => {
    const daySessions = sessionByDay.get(day.key) ?? [];
    const focus =
      daySessions.length > 0 ? average(daySessions.map((session) => session.focus)) : day.focus;

    return {
      label: day.label,
      volume: day.volume,
      diversity: day.uniqueArtists,
      discoveryRate: day.discoveryRate,
      focus,
    };
  });

  const volumes = points.map((point) => point.volume);
  const diversities = points.map((point) => point.diversity);
  const stability =
    1 -
    (variance(volumes) / Math.max(1, average(volumes) ** 2) +
      variance(diversities) / Math.max(1, average(diversities) ** 2)) /
      2;

  return {
    points,
    attractorStability: clamp01(stability),
  };
};

const sessionFeatures = (session: CachedRecentTrack[]): SessionFeatures => {
  const seen = new Set<string>();
  let newPlays = 0;
  let repeatPlays = 0;

  for (const track of session) {
    const key = trackKey(track.artistName, track.trackName);

    if (seen.has(key)) {
      repeatPlays += 1;
    } else {
      newPlays += 1;
      seen.add(key);
    }
  }

  const artistCounts = countByArtist(session);
  const counts = [...artistCounts.values()];
  const top = Math.max(0, ...counts);

  return {
    tracks: session,
    durationMinutes: sessionDurationMinutes(session),
    focus: session.length > 0 ? top / session.length : 0,
    artistEntropy: shannonEntropy(
      counts,
      counts.reduce((sum, count) => sum + count, 0),
    ),
    discoveryRate: session.length > 0 ? newPlays / session.length : 0,
    repeatRate: session.length > 0 ? repeatPlays / session.length : 0,
  };
};

const classifySessionMode = (session: SessionFeatures): ListeningMode => {
  if (session.focus >= 0.72) return "deep-dive";
  if (session.repeatRate >= 0.55) return "nostalgia";
  if (session.discoveryRate >= 0.35 && session.artistEntropy >= 0.75) return "explore";
  return "shuffle";
};

const countByArtist = (tracks: CachedRecentTrack[]) => {
  const counts = new Map<string, number>();

  for (const track of tracks) {
    const key = artistKey(track.artistName);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
};

const buildKaplanMeier = (delays: number[], horizon: number) => {
  const sorted = delays.filter((delay) => delay <= horizon).sort((left, right) => left - right);
  const points: SurvivalCurvePoint[] = [{ day: 0, survival: 1 }];
  let atRisk = delays.length || 1;
  let survival = 1;

  for (let day = 1; day <= horizon; day += 7) {
    const events = sorted.filter((delay) => delay >= day - 7 && delay < day).length;

    if (atRisk > 0) {
      survival *= 1 - events / atRisk;
      atRisk -= events;
    }

    points.push({ day, survival: clamp01(survival) });
  }

  return points;
};

const shannonEntropy = (counts: number[], total: number) => {
  if (total <= 0) return 0;

  return -counts.reduce((sum, count) => {
    if (count <= 0) return sum;
    const probability = count / total;

    return sum + probability * Math.log2(probability);
  }, 0);
};

const multiScaleEntropy = (series: number[]): MultiScaleEntropy[] => {
  const scales = [1, 7, 30].filter((scale) => series.length >= scale * 2);

  return scales.map((scale) => {
    const coarse = [];

    for (let index = 0; index <= series.length - scale; index += scale) {
      coarse.push(average(series.slice(index, index + scale)));
    }

    const differences = coarse
      .slice(1)
      .map((value, index) => Math.abs(value - (coarse[index] ?? 0)));
    const total = differences.reduce((sum, value) => sum + value, 0) || 1;
    const entropy = -differences.reduce((sum, value) => {
      const probability = value / total;

      return probability > 0 ? sum + probability * Math.log2(probability) : sum;
    }, 0);

    return { scale, entropy };
  });
};

const laggedCorrelation = (source: number[], target: number[], lag: number) => {
  if (source.length < lag + 4 || target.length < lag + 4) return 0;

  const left: number[] = [];
  const right: number[] = [];

  for (let index = 0; index < source.length - lag; index += 1) {
    left.push(source[index] ?? 0);
    right.push(target[index + lag] ?? 0);
  }

  return pearsonCorrelation(left, right);
};

const pearsonCorrelation = (left: number[], right: number[]) => {
  if (left.length !== right.length || left.length < 3) return 0;

  const leftMean = average(left);
  const rightMean = average(right);
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = (left[index] ?? 0) - leftMean;
    const rightDelta = (right[index] ?? 0) - rightMean;

    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }

  const denominator = Math.sqrt(leftVariance * rightVariance);

  if (denominator === 0) return 0;

  return clamp(numerator / denominator, -1, 1);
};

const totalVariationDistance = (left: Map<string, number>, right: Map<string, number>) => {
  const artists = new Set([...left.keys(), ...right.keys()]);
  const leftTotal = [...left.values()].reduce((sum, count) => sum + count, 0) || 1;
  const rightTotal = [...right.values()].reduce((sum, count) => sum + count, 0) || 1;
  let sum = 0;

  for (const artist of artists) {
    sum += Math.abs((left.get(artist) ?? 0) / leftTotal - (right.get(artist) ?? 0) / rightTotal);
  }

  return sum / 2;
};

const incrementPair = (matrix: Map<string, Map<string, number>>, from: string, to: string) => {
  const row = matrix.get(from) ?? new Map<string, number>();

  row.set(to, (row.get(to) ?? 0) + 1);
  matrix.set(from, row);
};

const buildTopPmiPairs = (
  coOccurrence: Map<string, Map<string, number>>,
  totals: Map<string, number>,
  labels: Map<string, string>,
  totalTracks: number,
): PmiNeighbor[] => {
  const pairs: PmiNeighbor[] = [];

  for (const [artist, neighbors] of coOccurrence.entries()) {
    for (const [neighbor, count] of neighbors.entries()) {
      if (artist >= neighbor) continue;

      const probability =
        count /
        Math.max(
          1,
          ((totals.get(artist) ?? 0) * (totals.get(neighbor) ?? 0)) / Math.max(1, totalTracks),
        );
      const pmi = Math.log2(Math.max(1e-9, probability));

      pairs.push({
        artist: labels.get(artist) ?? artist,
        neighbor: labels.get(neighbor) ?? neighbor,
        pmi,
      });
    }
  }

  return pairs.sort((left, right) => right.pmi - left.pmi).slice(0, 6);
};

const detectCommunities = (
  coOccurrence: Map<string, Map<string, number>>,
  labels: Map<string, string>,
  artistCounts: Map<string, number>,
  totalTracks: number,
): GraphCommunity[] => {
  const visited = new Set<string>();
  const communities: GraphCommunity[] = [];

  for (const artist of coOccurrence.keys()) {
    if (visited.has(artist)) continue;

    const queue = [artist];
    const members: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current || visited.has(current)) continue;

      visited.add(current);
      members.push(current);

      for (const [neighbor, count] of coOccurrence.get(current)?.entries() ?? []) {
        if (!visited.has(neighbor) && count >= 2) {
          queue.push(neighbor);
        }
      }
    }

    if (members.length >= 2) {
      const playShare =
        members.reduce((sum, member) => sum + (artistCounts.get(member) ?? 0), 0) /
        Math.max(1, totalTracks);

      communities.push({
        id: communities.length + 1,
        artists: members.slice(0, 5).map((member) => labels.get(member) ?? member),
        playShare,
      });
    }
  }

  return communities.sort((left, right) => right.playShare - left.playShare).slice(0, 4);
};

const findBridgeArtists = (
  coOccurrence: Map<string, Map<string, number>>,
  labels: Map<string, string>,
) =>
  [...coOccurrence.entries()]
    .map(([artist, neighbors]) => {
      const strength = [...neighbors.values()].reduce((sum, count) => sum + count, 0);
      const neighborCount = neighbors.size;

      return {
        label: labels.get(artist) ?? artist,
        score: neighborCount * Math.log2(strength + 1),
      };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.label);

const estimateModularity = (
  _coOccurrence: Map<string, Map<string, number>>,
  communities: GraphCommunity[],
) => {
  if (communities.length === 0) return 0;

  return clamp01(
    communities.reduce((sum, community) => sum + community.playShare, 0) / communities.length,
  );
};

const collapseConsecutiveArtists = (sequence: string[]) => {
  const collapsed: string[] = [];

  for (const artist of sequence) {
    if (collapsed.at(-1) === artist) continue;

    collapsed.push(artist);
  }

  return collapsed;
};

const minePatterns = (
  sessions: CachedRecentTrack[][],
  length: number,
  labels: Map<string, string>,
): SequentialPattern[] => {
  const counts = new Map<string, number>();
  const prefixCounts = new Map<string, number>();
  const suffixCounts = new Map<string, number>();
  let windowCount = 0;

  for (const session of sessions) {
    const sequence = collapseConsecutiveArtists(
      session
        .map((track) => artistKey(track.artistName))
        .filter((key): key is string => Boolean(key)),
    );

    for (let index = 0; index <= sequence.length - length; index += 1) {
      const pattern = sequence.slice(index, index + length);
      const key = pattern.join("→");

      windowCount += 1;
      counts.set(key, (counts.get(key) ?? 0) + 1);

      const prefix = pattern.slice(0, length - 1).join("→");
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);

      const last = pattern[length - 1];

      if (last) {
        suffixCounts.set(last, (suffixCounts.get(last) ?? 0) + 1);
      }
    }
  }

  const totalWindows = Math.max(1, windowCount);

  const scored = [...counts.entries()]
    .filter(([, count]) => count >= MIN_PATTERN_COUNT)
    .filter(([key]) => {
      const patternKeys = key.split("→");

      if (patternKeys.length < 2) return false;
      if (new Set(patternKeys).size === 1) return false;
      if (length === 2 && patternKeys[0] === patternKeys[1]) return false;

      return true;
    })
    .map(([key, count]) => {
      const patternKeys = key.split("→");
      const prefix = patternKeys.slice(0, length - 1).join("→");
      const last = patternKeys[length - 1] ?? "";
      const prefixTotal = Math.max(1, prefixCounts.get(prefix) ?? 1);
      const suffixTotal = Math.max(1, suffixCounts.get(last) ?? 1);
      const support = count / totalWindows;
      const confidence = count / prefixTotal;
      const marginalLast = suffixTotal / totalWindows;
      const lift = confidence / Math.max(1e-9, marginalLast);

      return {
        pattern: patternKeys.map((entry) => labels.get(entry) ?? entry),
        support,
        confidence,
        lift,
        count,
      };
    })
    .sort((left, right) => {
      if (right.lift !== left.lift) return right.lift - left.lift;

      return right.count - left.count;
    })
    .slice(0, 5);

  return scored.map(({ pattern, support, confidence, lift, count }) => ({
    pattern,
    occurrences: count,
    support,
    confidence,
    lift,
  }));
};

const findChangePoint = (values: number[]) => {
  let bestIndex = 0;
  let bestDelta = 0;

  for (let index = 2; index < values.length - 2; index += 1) {
    const before = average(values.slice(0, index));
    const after = average(values.slice(index));
    const delta = Math.abs(after - before);

    if (delta > bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  }

  return bestIndex;
};

const partialAutocorrelation = (series: number[], lag: number) => {
  const mean = average(series);
  const denominator = series.reduce((sum, value) => sum + (value - mean) ** 2, 0);

  if (denominator === 0) return 0;

  const numerator = series
    .slice(lag)
    .reduce((sum, value, index) => sum + (value - mean) * ((series[index] ?? mean) - mean), 0);

  return numerator / denominator;
};

const estimateHalfLife = (weeks: Map<string, number>, peakWeek: string, peakCount: number) => {
  const ordered = [...weeks.entries()].sort(([left], [right]) => left.localeCompare(right));
  const peakIndex = ordered.findIndex(([week]) => week === peakWeek);
  const threshold = peakCount / 2;

  for (let index = peakIndex + 1; index < ordered.length; index += 1) {
    if ((ordered[index]?.[1] ?? 0) <= threshold) {
      return Math.max(7, (index - peakIndex) * 7);
    }
  }

  return Math.max(7, (ordered.length - peakIndex) * 7);
};

const describeAnomaly = (session: SessionFeatures, means: number[]) => {
  const reasons = [];

  if (session.durationMinutes > (means[0] ?? 0) * 2) reasons.push("long duration");
  if (session.tracks.length > (means[1] ?? 0) * 2) reasons.push("many tracks");
  if (session.focus > (means[2] ?? 0) + 0.25) reasons.push("high focus");
  if (session.discoveryRate > (means[4] ?? 0) + 0.25) reasons.push("high discovery");

  return reasons.join(", ") || "unusual session mix";
};

const sessionDurationMinutes = (session: CachedRecentTrack[]) => {
  const first = session[0]?.playedAtTimestamp ?? 0;
  const last = session.at(-1)?.playedAtTimestamp ?? first;

  return Math.round((last - first) / 60);
};

const calculateGini = (counts: number[], total: number) => {
  if (total === 0) return 0;

  const ascending = [...counts].sort((left, right) => left - right);
  const weighted = ascending.reduce((sum, count, index) => sum + (index + 1) * count, 0);

  return (2 * weighted) / (ascending.length * total) - (ascending.length + 1) / ascending.length;
};

const dayKey = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const weekKey = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - firstDay.getTime()) / 86_400_000);

  return `${date.getFullYear()}-W${String(Math.ceil((days + firstDay.getDay() + 1) / 7)).padStart(2, "0")}`;
};

const formatDayLabel = (key: string) => {
  const [year = "", month = "", day = ""] = key.split("-");

  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const monthToTimestamp = (month: string) => {
  const [year = "0", monthPart = "1"] = month.split("-");

  return Math.floor(new Date(Number(year), Number(monthPart) - 1, 1).getTime() / 1000);
};

const nextMonth = (month: string) => {
  const [year = "0", monthPart = "1"] = month.split("-");
  const date = new Date(Number(year), Number(monthPart) - 1, 1);

  date.setMonth(date.getMonth() + 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const cumulativeSum = (values: number[]) => {
  let total = 0;

  return values.map((value) => {
    total += value;
    return total;
  });
};

const linearSlope = (xs: number[], ys: number[]) => {
  const meanX = average(xs);
  const meanY = average(ys);
  const numerator = xs.reduce((sum, x, index) => sum + (x - meanX) * ((ys[index] ?? 0) - meanY), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);

  return denominator === 0 ? 0 : numerator / denominator;
};

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const median = (values: number[]) => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};

const variance = (values: number[]) => {
  const mean = average(values);

  return average(values.map((value) => (value - mean) ** 2));
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const clamp01 = (value: number) => clamp(value, 0, 1);
