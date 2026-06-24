import type { MarkovGraphEdge, MarkovGraphNode } from "@/lib/markov-graph";

export const VIBE_GROUP_COLORS = [
  "#00e5ff", // cyan
  "#ff4da6", // hot pink
  "#76ff03", // lime
  "#b388ff", // lavender
  "#ffea00", // yellow
  "#ff6e40", // coral
  "#18ffff", // aqua
  "#ea80fc", // magenta
  "#69f0ae", // mint
  "#ffd740", // amber
  "#448aff", // blue
  "#ff80ab", // pink
  "#b2ff59", // lime green
  "#8c9eff", // periwinkle
  "#ff9e80", // peach
  "#a7ffeb", // teal
];

export type VibeGroup = {
  id: number;
  color: string;
  label: string;
  artists: string[];
  artistIds: string[];
  internalSwitches: number;
};

export type ClusterLayoutNode = MarkovGraphNode & {
  x: number;
  y: number;
  radius: number;
  groupId: number;
  groupColor: string;
};

const OTHERS_GROUP_COLOR = "#6b7280";
export const MAX_VIBE_LAYOUT_GROUPS = 24;

const buildAdjacency = (edges: MarkovGraphEdge[], clusterMinCount: number) => {
  const adjacency = new Map<string, Map<string, number>>();

  for (const edge of edges) {
    if (edge.count < clusterMinCount) continue;

    const fromRow = adjacency.get(edge.fromId) ?? new Map<string, number>();
    fromRow.set(edge.toId, (fromRow.get(edge.toId) ?? 0) + edge.count);
    adjacency.set(edge.fromId, fromRow);

    const toRow = adjacency.get(edge.toId) ?? new Map<string, number>();
    toRow.set(edge.fromId, (toRow.get(edge.fromId) ?? 0) + edge.count);
    adjacency.set(edge.toId, toRow);
  }

  return adjacency;
};

const neighborWeight = (adjacency: Map<string, Map<string, number>>, nodeId: string) => {
  let total = 0;

  for (const weight of adjacency.get(nodeId)?.values() ?? []) {
    total += weight;
  }

  return total;
};

const detectCommunities = (
  nodes: MarkovGraphNode[],
  edges: MarkovGraphEdge[],
  clusterMinCount: number,
) => {
  const adjacency = buildAdjacency(edges, clusterMinCount);
  const labels = new Map<string, number>();

  nodes.forEach((node, index) => {
    labels.set(node.id, index);
  });

  const orderedNodes = [...nodes].sort(
    (left, right) => neighborWeight(adjacency, right.id) - neighborWeight(adjacency, left.id),
  );

  for (let pass = 0; pass < 18; pass += 1) {
    let changed = false;

    for (const node of orderedNodes) {
      const votes = new Map<number, number>();

      for (const [neighborId, weight] of adjacency.get(node.id) ?? []) {
        const label = labels.get(neighborId);

        if (label === undefined) continue;

        votes.set(label, (votes.get(label) ?? 0) + weight);
      }

      if (votes.size === 0) continue;

      const [bestLabel] = [...votes.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];

      if (bestLabel === undefined) continue;

      if (labels.get(node.id) !== bestLabel) {
        labels.set(node.id, bestLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  const remap = new Map<number, number>();

  for (const label of labels.values()) {
    if (!remap.has(label)) {
      remap.set(label, remap.size);
    }
  }

  const membership = new Map<string, number>();

  for (const [nodeId, label] of labels.entries()) {
    membership.set(nodeId, remap.get(label) ?? 0);
  }

  return membership;
};

export const detectVibeGroups = (
  nodes: MarkovGraphNode[],
  edges: MarkovGraphEdge[],
  options?: { clusterMinCount?: number },
): { groups: VibeGroup[]; membership: Map<string, number> } => {
  const clusterMinCount = Math.max(2, options?.clusterMinCount ?? 2);
  const communityMembership = detectCommunities(nodes, edges, clusterMinCount);
  const buckets = new Map<number, MarkovGraphNode[]>();

  for (const node of nodes) {
    const groupId = communityMembership.get(node.id) ?? 0;
    const bucket = buckets.get(groupId) ?? [];

    bucket.push(node);
    buckets.set(groupId, bucket);
  }

  const sortedBuckets = [...buckets.entries()]
    .sort((left, right) => {
      const leftWeight = left[1].reduce((sum, node) => sum + node.outTransitions, 0);
      const rightWeight = right[1].reduce((sum, node) => sum + node.outTransitions, 0);

      return rightWeight - leftWeight;
    })
    .map(([, members]) => members);

  const draftGroups: VibeGroup[] = [];
  const orphanIds: string[] = [];

  sortedBuckets.forEach((members, index) => {
    const ordered = [...members].sort((left, right) => right.outTransitions - left.outTransitions);
    const artistIds = ordered.map((node) => node.id);
    const internalSwitches = edges
      .filter((edge) => artistIds.includes(edge.fromId) && artistIds.includes(edge.toId))
      .reduce((sum, edge) => sum + edge.count, 0);

    if (artistIds.length === 1 && internalSwitches < clusterMinCount) {
      orphanIds.push(...artistIds);
      return;
    }

    draftGroups.push({
      id: index,
      color: VIBE_GROUP_COLORS[draftGroups.length % VIBE_GROUP_COLORS.length] ?? "#60a5fa",
      label: ordered[0]?.label ?? `Group ${draftGroups.length + 1}`,
      artists: ordered.slice(0, 4).map((node) => node.label),
      artistIds,
      internalSwitches,
    });
  });

  const groups = [...draftGroups].sort(
    (left, right) => right.internalSwitches - left.internalSwitches,
  );

  const overflowArtistIds: string[] = [...orphanIds];

  if (groups.length > MAX_VIBE_LAYOUT_GROUPS) {
    const kept = groups.slice(0, MAX_VIBE_LAYOUT_GROUPS);
    const dropped = groups.slice(MAX_VIBE_LAYOUT_GROUPS);

    groups.length = 0;
    groups.push(...kept);

    for (const group of dropped) {
      overflowArtistIds.push(...group.artistIds);
    }
  }

  if (overflowArtistIds.length > 0) {
    const uniqueOverflow = [...new Set(overflowArtistIds)];
    const overflowNodes = nodes.filter((node) => uniqueOverflow.includes(node.id));
    const ordered = [...overflowNodes].sort(
      (left, right) => right.outTransitions - left.outTransitions,
    );
    const existingOthers = groups.find((group) => group.label === "Other switches");

    if (existingOthers) {
      const mergedIds = [...new Set([...existingOthers.artistIds, ...uniqueOverflow])];
      const mergedNodes = nodes.filter((node) => mergedIds.includes(node.id));
      const mergedOrdered = [...mergedNodes].sort(
        (left, right) => right.outTransitions - left.outTransitions,
      );

      existingOthers.artistIds = mergedOrdered.map((node) => node.id);
      existingOthers.artists = mergedOrdered.slice(0, 4).map((node) => node.label);
      existingOthers.internalSwitches = edges
        .filter(
          (edge) =>
            existingOthers.artistIds.includes(edge.fromId) &&
            existingOthers.artistIds.includes(edge.toId),
        )
        .reduce((sum, edge) => sum + edge.count, 0);
    } else {
      groups.push({
        id: groups.length,
        color: OTHERS_GROUP_COLOR,
        label: "Other switches",
        artists: ordered.slice(0, 4).map((node) => node.label),
        artistIds: ordered.map((node) => node.id),
        internalSwitches: edges
          .filter(
            (edge) => uniqueOverflow.includes(edge.fromId) && uniqueOverflow.includes(edge.toId),
          )
          .reduce((sum, edge) => sum + edge.count, 0),
      });
    }
  }

  const membership = new Map<string, number>();

  groups.forEach((group, index) => {
    group.id = index;

    for (const artistId of group.artistIds) {
      membership.set(artistId, index);
    }
  });

  return { groups, membership };
};

export const layoutVibeGroups = (
  nodes: MarkovGraphNode[],
  edges: MarkovGraphEdge[],
  membership: Map<string, number>,
  groups: VibeGroup[],
): ClusterLayoutNode[] => {
  const byGroup = new Map<number, MarkovGraphNode[]>();

  for (const node of nodes) {
    const groupId = membership.get(node.id) ?? 0;
    const bucket = byGroup.get(groupId) ?? [];

    bucket.push(node);
    byGroup.set(groupId, bucket);
  }

  const activeGroups = groups.filter((group) => (byGroup.get(group.id)?.length ?? 0) > 0);
  const columns = Math.max(1, Math.ceil(Math.sqrt(activeGroups.length)));
  const cellWidth = 280;
  const cellHeight = 240;
  const layout: ClusterLayoutNode[] = [];

  activeGroups.forEach((group, index) => {
    const members = [...(byGroup.get(group.id) ?? [])].sort(
      (left, right) => right.outTransitions - left.outTransitions,
    );
    const col = index % columns;
    const row = Math.floor(index / columns);
    const centerX = col * cellWidth + cellWidth / 2;
    const centerY = row * cellHeight + cellHeight / 2;
    const maxOut = Math.max(1, ...members.map((node) => node.outTransitions));
    const hub = members[0];

    if (hub) {
      layout.push({
        ...hub,
        x: centerX,
        y: centerY,
        radius: 10 + (hub.outTransitions / maxOut) * 8,
        groupId: group.id,
        groupColor: group.color,
      });
    }

    const satellites = members.slice(1, 18);

    satellites.forEach((node, satelliteIndex) => {
      const angle = (satelliteIndex / Math.max(1, satellites.length)) * Math.PI * 2;
      const ring = 52 + Math.floor(satelliteIndex / 6) * 28;

      layout.push({
        ...node,
        x: centerX + Math.cos(angle) * ring,
        y: centerY + Math.sin(angle) * ring,
        radius: 4 + (node.outTransitions / maxOut) * 6,
        groupId: group.id,
        groupColor: group.color,
      });
    });
  });

  return layout;
};

export type VibeGroupBounds = {
  groupId: number;
  color: string;
  label: string;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  memberCount: number;
};

export const computeVibeGroupBounds = (
  layout: ClusterLayoutNode[],
  groups: VibeGroup[],
): VibeGroupBounds[] => {
  const byGroup = new Map<number, ClusterLayoutNode[]>();

  for (const node of layout) {
    const bucket = byGroup.get(node.groupId) ?? [];

    bucket.push(node);
    byGroup.set(node.groupId, bucket);
  }

  return groups
    .map((group) => {
      const members = byGroup.get(group.id) ?? [];

      if (members.length === 0) return null;

      const xs = members.map((node) => node.x);
      const ys = members.map((node) => node.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const padding = 36;

      return {
        groupId: group.id,
        color: group.color,
        label: group.label,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: Math.max(120, maxX - minX + padding * 2),
        height: Math.max(100, maxY - minY + padding * 2),
        memberCount: members.length,
      };
    })
    .filter((bounds): bounds is VibeGroupBounds => bounds !== null);
};

export const partitionEdges = (edges: MarkovGraphEdge[], membership: Map<string, number>) => {
  const internal: MarkovGraphEdge[] = [];
  const cross: MarkovGraphEdge[] = [];

  for (const edge of edges) {
    const fromGroup = membership.get(edge.fromId);
    const toGroup = membership.get(edge.toId);

    if (fromGroup !== undefined && fromGroup === toGroup) {
      internal.push(edge);
    } else {
      cross.push(edge);
    }
  }

  return {
    internal,
    cross: cross.sort((left, right) => right.count - left.count),
  };
};
