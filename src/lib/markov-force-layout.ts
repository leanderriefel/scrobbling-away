import type { MarkovGraphEdge, MarkovGraphNode } from "@/lib/markov-graph";
import type { ClusterLayoutNode, VibeGroup } from "@/lib/markov-vibe-groups";
import ForceLayoutWorker from "./markov-force-layout.worker?worker";

type SimNode = ClusterLayoutNode & {
  vx: number;
  vy: number;
};

type LayoutEdge = {
  source: SimNode;
  target: SimNode;
  weight: number;
};

export const layoutForceGraph = (
  nodes: MarkovGraphNode[],
  edges: MarkovGraphEdge[],
  membership: Map<string, number>,
  groups: VibeGroup[],
): Promise<ClusterLayoutNode[]> => {
  if (nodes.length === 0) return Promise.resolve([]);

  return new Promise((resolve) => {
    try {
      const worker = new ForceLayoutWorker();
      worker.onmessage = (event: MessageEvent<ClusterLayoutNode[]>) => {
        resolve(event.data);
        worker.terminate();
      };
      worker.onerror = () => {
        worker.terminate();
        // Fallback to inline
        resolve(layoutForceGraphInline(nodes, edges, membership, groups));
      };
      worker.postMessage({
        nodes,
        edges,
        membershipEntries: [...membership.entries()],
        groups,
      });
    } catch {
      // Worker not available (SSR etc), fallback
      resolve(layoutForceGraphInline(nodes, edges, membership, groups));
    }
  });
};

const layoutForceGraphInline = (
  nodes: MarkovGraphNode[],
  edges: MarkovGraphEdge[],
  membership: Map<string, number>,
  groups: VibeGroup[],
): ClusterLayoutNode[] => {
  if (nodes.length === 0) return [];

  const groupColor = new Map(groups.map((group) => [group.id, group.color]));
  const maxOut = Math.max(1, ...nodes.map((node) => node.outTransitions));
  const nodeCount = nodes.length;
  const activeGroupIds = [...new Set(nodes.map((node) => membership.get(node.id) ?? 0))].sort(
    (left, right) => left - right,
  );
  // Spread out cluster centers much wider initially
  const clusterRing = 500 + Math.sqrt(activeGroupIds.length) * 160;
  const groupAnchor = new Map(
    activeGroupIds.map((groupId, index) => {
      const angle = (index / Math.max(1, activeGroupIds.length)) * Math.PI * 2;

      return [groupId, { x: Math.cos(angle) * clusterRing, y: Math.sin(angle) * clusterRing }];
    }),
  );
  const radiusScale = nodeCount > 1500 ? 0.55 : nodeCount > 600 ? 0.75 : 1;

  const simNodes: SimNode[] = nodes.map((node, index) => {
    const groupId = membership.get(node.id) ?? 0;
    const anchor = groupAnchor.get(groupId) ?? { x: 0, y: 0 };
    const localAngle = (index % 11) * 0.95;

    // Start nodes wider within their initial clusters
    return {
      ...node,
      x: anchor.x + Math.cos(localAngle) * (30 + (index % 5) * 6),
      y: anchor.y + Math.sin(localAngle) * (30 + (index % 5) * 6),
      vx: 0,
      vy: 0,
      radius: (1.8 + (node.outTransitions / maxOut) * 5.5) * radiusScale,
      groupId,
      groupColor: groupColor.get(groupId) ?? "#60a5fa",
    };
  });

  const nodeMap = new Map(simNodes.map((node) => [node.id, node]));
  const layoutEdges: LayoutEdge[] = [];

  for (const edge of edges) {
    const source = nodeMap.get(edge.fromId);
    const target = nodeMap.get(edge.toId);

    if (!source || !target) continue;

    // Use composite strength: probability * count
    layoutEdges.push({ source, target, weight: edge.probability * edge.count });
  }

  const maxWeight = Math.max(1, ...layoutEdges.map((edge) => edge.weight));
  const iterations =
    nodeCount > 2000
      ? 45
      : nodeCount > 1000
        ? 55
        : nodeCount > 400
          ? 70
          : nodeCount > 120
            ? 95
            : 140;

  // Stronger repulsion force to push nodes further apart
  const repulsion = 2400 + nodeCount * 22;
  const linkStrength = nodeCount > 1000 ? 0.015 : 0.025;
  // Only use grid repulsion for large graphs where N > 600
  const useGridRepulsion = nodeCount > 600;
  // Larger grid cellSize to handle the wider coordinates
  const cellSize = 80 + Math.sqrt(nodeCount) * 3.5;

  for (let step = 0; step < iterations; step += 1) {
    if (useGridRepulsion) {
      applyGridRepulsion(simNodes, cellSize, repulsion);
    } else {
      applyPairwiseRepulsion(simNodes, repulsion);
    }

    for (const edge of layoutEdges) {
      const dx = edge.target.x - edge.source.x;
      const dy = edge.target.y - edge.source.y;
      const distance = Math.max(Math.hypot(dx, dy), 0.8);
      const weightRatio = edge.weight / maxWeight;
      // Longer ideal edge lengths
      const idealLength = 75 + (1 - weightRatio) * (nodeCount > 1000 ? 70 : 100);
      const force = (distance - idealLength) * linkStrength * (0.35 + weightRatio * 2.2);
      const offsetX = (dx / distance) * force;
      const offsetY = (dy / distance) * force;

      edge.source.vx += offsetX;
      edge.source.vy += offsetY;
      edge.target.vx -= offsetX;
      edge.target.vy -= offsetY;
    }

    const centroids = new Map<number, { x: number; y: number; count: number }>();

    for (const node of simNodes) {
      const bucket = centroids.get(node.groupId) ?? { x: 0, y: 0, count: 0 };

      bucket.x += node.x;
      bucket.y += node.y;
      bucket.count += 1;
      centroids.set(node.groupId, bucket);
    }

    // Inter-cluster centroid repulsion
    const centroidList = [...centroids.entries()].map(([id, c]) => ({
      id,
      x: c.x / c.count,
      y: c.y / c.count,
      count: c.count,
    }));
    const centroidRepulsion = 12000 + nodeCount * 50;
    for (let i = 0; i < centroidList.length; i++) {
      for (let j = i + 1; j < centroidList.length; j++) {
        const a = centroidList[i]!;
        const b = centroidList[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const force = centroidRepulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        // Push all nodes in each cluster
        for (const node of simNodes) {
          if (node.groupId === a.id) {
            node.vx -= fx * 0.08;
            node.vy -= fy * 0.08;
          } else if (node.groupId === b.id) {
            node.vx += fx * 0.08;
            node.vy += fy * 0.08;
          }
        }
      }
    }

    // Slightly weaker pull to center to allow clusters to drift wider
    const clusterPull = nodeCount > 1000 ? 0.015 : 0.025;

    for (const node of simNodes) {
      const centroid = centroids.get(node.groupId);

      if (!centroid || centroid.count === 0) continue;

      const centerX = centroid.x / centroid.count;
      const centerY = centroid.y / centroid.count;

      node.vx += (centerX - node.x) * clusterPull;
      node.vy += (centerY - node.y) * clusterPull;
      node.vx -= node.x * 0.001;
      node.vy -= node.y * 0.001;
      node.vx = clamp(node.vx, -8, 8);
      node.vy = clamp(node.vy, -8, 8);
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= 0.84;
      node.vy *= 0.84;
    }
  }

  return normalizeLayout(simNodes);
};

const applyPairwiseRepulsion = (nodes: SimNode[], repulsion: number) => {
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      const a = nodes[left];
      const b = nodes[right];

      if (!a || !b) continue;

      repulse(a, b, repulsion, 1200);
    }
  }
};

const applyGridRepulsion = (nodes: SimNode[], cellSize: number, repulsion: number) => {
  const grid = new Map<string, SimNode[]>();

  for (const node of nodes) {
    const key = cellKey(node.x, node.y, cellSize);
    const bucket = grid.get(key) ?? [];

    bucket.push(node);
    grid.set(key, bucket);
  }

  for (const node of nodes) {
    const cx = Math.floor(node.x / cellSize);
    const cy = Math.floor(node.y / cellSize);

    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const bucket = grid.get(`${cx + offsetX},${cy + offsetY}`) ?? [];

        for (const other of bucket) {
          if (other.id === node.id) continue;

          repulse(node, other, repulsion, cellSize);
        }
      }
    }
  }
};

const repulse = (a: SimNode, b: SimNode, repulsion: number, maxDistance: number) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.max(Math.hypot(dx, dy), 0.8);
  if (distance >= maxDistance) return;

  // Smooth circular force cutoff
  const force = (repulsion / (distance * distance)) * (1 - distance / maxDistance);
  const offsetX = (dx / distance) * force;
  const offsetY = (dy / distance) * force;

  a.vx -= offsetX;
  a.vy -= offsetY;
  b.vx += offsetX;
  b.vy += offsetY;
};

const cellKey = (x: number, y: number, cellSize: number) => {
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);

  return `${cx},${cy}`;
};

const normalizeLayout = (layout: SimNode[]): ClusterLayoutNode[] => {
  if (layout.length === 0) return layout;

  const xs = layout.map((node) => node.x);
  const ys = layout.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  // Normalization target size scales dynamically with number of nodes
  const targetSize = 1200 + Math.sqrt(layout.length) * 20;
  const scale = targetSize / Math.max(width, height);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return layout.map((node) => ({
    ...node,
    x: (node.x - centerX) * scale,
    y: (node.y - centerY) * scale,
    vx: 0,
    vy: 0,
  }));
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
