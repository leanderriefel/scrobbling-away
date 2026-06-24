import type { CachedRecentTrack } from "@/lib/lastfm-stats-cache";
import {
  resolveSessionGapSeconds,
  sortTracksChronologically,
  splitListeningSessions,
} from "@/lib/listening-sessions";
import { artistKey } from "@/utils/track-keys";

export const MARKOV_MIN_PAIR_COUNT = 3;
export const MARKOV_MIN_SOURCE_TRANSITIONS = 8;

export type MarkovGraphNode = {
  id: string;
  label: string;
  plays: number;
  outTransitions: number;
  inTransitions: number;
};

export type MarkovGraphEdge = {
  fromId: string;
  toId: string;
  fromLabel: string;
  toLabel: string;
  count: number;
  probability: number;
};

export type MarkovGraph = {
  nodes: MarkovGraphNode[];
  edges: MarkovGraphEdge[];
};

export type MarkovSummaryTransition = {
  from: string;
  to: string;
  probability: number;
  count: number;
};

export type MarkovSummaryHub = {
  label: string;
  inFlow: number;
  outFlow: number;
  hubScore: number;
};

export type MarkovSummary = {
  mixingSteps: number;
  stationaryDivergence: number;
  hubArtists: MarkovSummaryHub[];
  topTransitions: MarkovSummaryTransition[];
};

export const buildSessionMarkovGraph = (tracks: CachedRecentTrack[]): MarkovGraph => {
  if (tracks.length === 0) {
    return { nodes: [], edges: [] };
  }

  const chronological = sortTracksChronologically(tracks);
  const sessions = splitListeningSessions(chronological, resolveSessionGapSeconds(chronological));
  const labels = new Map<string, string>();
  const plays = new Map<string, number>();
  const transitions = new Map<string, Map<string, number>>();
  const outTotals = new Map<string, number>();
  const inTotals = new Map<string, number>();

  for (const track of chronological) {
    const key = artistKey(track.artistName);

    if (!key) continue;

    labels.set(key, track.artistName);
    plays.set(key, (plays.get(key) ?? 0) + 1);
  }

  for (const session of sessions) {
    let previousArtist: string | undefined;

    for (const track of session) {
      const current = artistKey(track.artistName);

      if (!current) continue;

      if (previousArtist && previousArtist !== current) {
        const row = transitions.get(previousArtist) ?? new Map<string, number>();

        row.set(current, (row.get(current) ?? 0) + 1);
        transitions.set(previousArtist, row);
        outTotals.set(previousArtist, (outTotals.get(previousArtist) ?? 0) + 1);
        inTotals.set(current, (inTotals.get(current) ?? 0) + 1);
      }

      previousArtist = current;
    }
  }

  const edges: MarkovGraphEdge[] = [];

  for (const [fromId, row] of transitions.entries()) {
    const total = outTotals.get(fromId) ?? 0;

    if (total === 0) continue;

    for (const [toId, count] of row.entries()) {
      edges.push({
        fromId,
        toId,
        fromLabel: labels.get(fromId) ?? fromId,
        toLabel: labels.get(toId) ?? toId,
        count,
        probability: count / total,
      });
    }
  }

  const nodeIds = new Set<string>([...plays.keys(), ...outTotals.keys(), ...inTotals.keys()]);
  const nodes = [...nodeIds]
    .map((id) => ({
      id,
      label: labels.get(id) ?? id,
      plays: plays.get(id) ?? 0,
      outTransitions: outTotals.get(id) ?? 0,
      inTransitions: inTotals.get(id) ?? 0,
    }))
    .sort((left, right) => right.outTransitions - left.outTransitions);

  return {
    nodes,
    edges: edges.sort((left, right) => right.count - left.count),
  };
};

export const sliceMarkovEdgesByMinCount = (edges: MarkovGraphEdge[], minCount: number) => {
  if (minCount <= 1 || edges.length === 0) return edges;

  let low = 0;
  let high = edges.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    if ((edges[mid]?.count ?? 0) >= minCount) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return edges.slice(0, low);
};

export type MarkovGraphView = {
  edges: MarkovGraphEdge[];
  nodeIds: Set<string>;
  totalMatching: number;
  capped: boolean;
};

export const selectMarkovGraphView = (
  edges: MarkovGraphEdge[],
  minCount: number,
  options?: {
    searchQuery?: string;
    selectedNodeId?: string | null;
    maxEdges?: number;
    maxSelectedEdges?: number;
  },
): MarkovGraphView => {
  const normalized = options?.searchQuery?.trim().toLocaleLowerCase() ?? "";
  const selected = options?.selectedNodeId ?? null;
  const thresholded = sliceMarkovEdgesByMinCount(edges, minCount);
  const matching: MarkovGraphEdge[] = [];

  for (const edge of thresholded) {
    if (selected && edge.fromId !== selected && edge.toId !== selected) continue;

    if (
      normalized &&
      !edge.fromLabel.toLocaleLowerCase().includes(normalized) &&
      !edge.toLabel.toLocaleLowerCase().includes(normalized)
    ) {
      continue;
    }

    matching.push(edge);
  }

  const nodeIds = new Set<string>();

  for (const edge of matching) {
    nodeIds.add(edge.fromId);
    nodeIds.add(edge.toId);
  }

  if (selected) nodeIds.add(selected);

  return {
    edges: matching,
    nodeIds,
    totalMatching: matching.length,
    capped: false,
  };
};

export const filterMarkovEdges = (edges: MarkovGraphEdge[], minCount: number, searchQuery = "") => {
  const thresholded = sliceMarkovEdgesByMinCount(edges, minCount);
  const normalized = searchQuery.trim().toLocaleLowerCase();

  if (!normalized) return thresholded;

  const matches: MarkovGraphEdge[] = [];

  for (const edge of thresholded) {
    if (
      edge.fromLabel.toLocaleLowerCase().includes(normalized) ||
      edge.toLabel.toLocaleLowerCase().includes(normalized)
    ) {
      matches.push(edge);
    }
  }

  return matches;
};

export const summarizeMarkovGraph = (graph: MarkovGraph, topArtistLimit = 40): MarkovSummary => {
  if (graph.nodes.length === 0) {
    return {
      mixingSteps: 0,
      stationaryDivergence: 0,
      hubArtists: [],
      topTransitions: [],
    };
  }

  const outTotals = new Map(graph.nodes.map((node) => [node.id, node.outTransitions]));
  const inTotals = new Map(graph.nodes.map((node) => [node.id, node.inTransitions]));
  const states = graph.nodes
    .filter((node) => node.outTransitions >= MARKOV_MIN_SOURCE_TRANSITIONS)
    .slice(0, topArtistLimit)
    .map((node) => node.id);
  const transitions = new Map<string, Map<string, number>>();

  for (const edge of graph.edges) {
    if (!states.includes(edge.fromId)) continue;

    const row = transitions.get(edge.fromId) ?? new Map<string, number>();

    row.set(edge.toId, edge.count);
    transitions.set(edge.fromId, row);
  }

  const matrix = states.map((from) => {
    const row = transitions.get(from);
    const total = outTotals.get(from) ?? 0;

    return states.map((to) => (total > 0 ? (row?.get(to) ?? 0) / total : 0));
  });

  const totalPlays = graph.nodes.reduce((sum, node) => sum + node.plays, 0);
  const empiricalDist = states.map((state) => {
    const node = graph.nodes.find((entry) => entry.id === state);

    return (node?.plays ?? 0) / Math.max(1, totalPlays);
  });
  const stationary = powerIteration(matrix, states.length);
  const transitionTotal = graph.edges.reduce((sum, edge) => sum + edge.count, 0);

  return {
    mixingSteps: estimateMixingSteps(matrix, stationary),
    stationaryDivergence: klDivergence(stationary, empiricalDist),
    hubArtists: states
      .map((state) => {
        const node = graph.nodes.find((entry) => entry.id === state);

        return {
          label: node?.label ?? state,
          inFlow: inTotals.get(state) ?? 0,
          outFlow: outTotals.get(state) ?? 0,
          hubScore:
            ((inTotals.get(state) ?? 0) + (outTotals.get(state) ?? 0)) /
            Math.max(1, transitionTotal),
        };
      })
      .sort((left, right) => right.hubScore - left.hubScore)
      .slice(0, 5),
    topTransitions: graph.edges
      .filter((edge) => (outTotals.get(edge.fromId) ?? 0) >= MARKOV_MIN_SOURCE_TRANSITIONS)
      .filter((edge) => edge.count >= MARKOV_MIN_PAIR_COUNT)
      .slice(0, 6)
      .map((edge) => ({
        from: edge.fromLabel,
        to: edge.toLabel,
        probability: edge.probability,
        count: edge.count,
      })),
  };
};

const powerIteration = (matrix: number[][], size: number) => {
  let vector = Array.from({ length: size }, () => 1 / Math.max(1, size));

  for (let step = 0; step < 24; step += 1) {
    const next = Array.from({ length: size }, () => 0);

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        next[col] = (next[col] ?? 0) + (matrix[row]?.[col] ?? 0) * (vector[row] ?? 0);
      }
    }

    const sum = next.reduce((total, value) => total + value, 0) || 1;
    vector = next.map((value) => value / sum);
  }

  return vector;
};

const estimateMixingSteps = (matrix: number[][], stationary: number[]) => {
  let distribution = matrix.map((row) => average(row));
  const sum = distribution.reduce((total, value) => total + value, 0) || 1;
  distribution = distribution.map((value) => value / sum);

  for (let step = 1; step <= 24; step += 1) {
    const next = Array.from({ length: distribution.length }, () => 0);

    for (let row = 0; row < distribution.length; row += 1) {
      for (let col = 0; col < distribution.length; col += 1) {
        next[col] = (next[col] ?? 0) + (matrix[row]?.[col] ?? 0) * (distribution[row] ?? 0);
      }
    }

    const distance = next.reduce(
      (total, value, index) => total + Math.abs(value - (stationary[index] ?? 0)),
      0,
    );

    if (distance < 0.2) return step;
    distribution = next;
  }

  return 24;
};

const klDivergence = (left: number[], right: number[]) =>
  left.reduce((sum, value, index) => {
    const target = right[index] ?? 1e-9;
    const safe = Math.max(value, 1e-9);

    return sum + safe * Math.log(safe / target);
  }, 0);

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
