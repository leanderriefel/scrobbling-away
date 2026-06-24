import type { MarkovGraphEdge } from "@/lib/markov-graph";
import type { ClusterLayoutNode } from "@/lib/markov-vibe-groups";

type Rgb = { r: number; g: number; b: number };

export type GraphTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const colorCache = new Map<string, Rgb>();

export const parseColor = (color: string): Rgb => {
  const cached = colorCache.get(color);
  if (cached) return cached;

  const hex = color.trim();

  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const value = hex.slice(1);

    const result: Rgb = {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16),
    };
    colorCache.set(color, result);
    return result;
  }

  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    const value = hex.slice(1);
    const rChar = value[0] ?? "0";
    const gChar = value[1] ?? "0";
    const bChar = value[2] ?? "0";

    const result: Rgb = {
      r: Number.parseInt(rChar + rChar, 16),
      g: Number.parseInt(gChar + gChar, 16),
      b: Number.parseInt(bChar + bChar, 16),
    };
    colorCache.set(color, result);
    return result;
  }

  const fallback: Rgb = { r: 148, g: 163, b: 184 };
  colorCache.set(color, fallback);
  return fallback;
};

export const withAlpha = (color: string, alpha: number) => {
  const { r, g, b } = parseColor(color);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const mixColors = (left: string, right: string, ratio: number) => {
  const a = parseColor(left);
  const b = parseColor(right);
  const t = clamp(ratio, 0, 1);

  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const blue = Math.round(a.b + (b.b - a.b) * t);

  return `rgb(${r}, ${g}, ${blue})`;
};

// Caches for fast style strings
const alphaColorCache = new Map<string, string>();
const mixedColorCache = new Map<string, string>();

export const getColorWithAlpha = (color: string, alpha: number): string => {
  const roundedAlpha = Math.round(alpha * 100) / 100;
  const key = `${color}_${roundedAlpha.toFixed(2)}`;
  let cached = alphaColorCache.get(key);
  if (cached) return cached;

  const { r, g, b } = parseColor(color);
  cached = `rgba(${r}, ${g}, ${b}, ${roundedAlpha})`;
  alphaColorCache.set(key, cached);
  return cached;
};

export const getMixedColorWithAlpha = (
  colorA: string,
  colorB: string,
  ratio: number,
  alpha: number,
): string => {
  const roundedAlpha = Math.round(alpha * 100) / 100;
  const key = `${colorA}_${colorB}_${ratio.toFixed(2)}_${roundedAlpha.toFixed(2)}`;
  let cached = mixedColorCache.get(key);
  if (cached) return cached;

  const a = parseColor(colorA);
  const b = parseColor(colorB);
  const t = clamp(ratio, 0, 1);

  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const blue = Math.round(a.b + (b.b - a.b) * t);

  cached = `rgba(${r}, ${g}, ${blue}, ${roundedAlpha})`;
  mixedColorCache.set(key, cached);
  return cached;
};

export const isEdgeActive = (
  edge: MarkovGraphEdge,
  options: {
    hoverNodeId: string | null;
    selectedNodeId: string | null;
    neighborIds?: Set<string> | null;
  },
) => {
  if (!options.hoverNodeId && !options.selectedNodeId) return true;

  const focusId = options.selectedNodeId ?? options.hoverNodeId;

  if (!focusId) return true;

  // High-performance direct connection filter (removes neighbor-to-neighbor lines)
  return edge.fromId === focusId || edge.toId === focusId;
};

export const drawForceGraph = (
  canvas: HTMLCanvasElement,
  layout: ClusterLayoutNode[],
  edges: MarkovGraphEdge[],
  transform: { scale: number; offsetX: number; offsetY: number },
  selectedNodeId: string | null,
  hoverNodeId: string | null,
  palette: { background: string; label: string; nodeSelectedStroke: string },
) => {
  const context = canvas.getContext("2d");

  if (!context || layout.length === 0) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const nodeMap = new Map(layout.map((node) => [node.id, node]));
  const focusId = selectedNodeId ?? hoverNodeId;

  // Calculate neighborIds internally to ensure zero state latency
  const neighborIds = new Set<string>();
  if (focusId) {
    neighborIds.add(focusId);
    for (const edge of edges) {
      if (edge.fromId === focusId) neighborIds.add(edge.toId);
      else if (edge.toId === focusId) neighborIds.add(edge.fromId);
    }
  }

  const maxEdgeStrength = Math.max(1, ...edges.map((edge) => edge.probability * edge.count));
  const edgeDetail: "far" | "near" = transform.scale >= 1.8 || focusId !== null ? "near" : "far";
  const edgeAlphaBase = focusId ? 0.1 : 0.16;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  // Dark background with subtle vignette
  context.fillStyle = palette.background;
  context.fillRect(0, 0, width, height);
  const vignetteGradient = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7,
  );
  vignetteGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignetteGradient.addColorStop(1, "rgba(0, 0, 0, 0.3)");
  context.fillStyle = vignetteGradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(transform.offsetX, transform.offsetY);
  context.scale(transform.scale, transform.scale);

  // Frustum culling — compute visible world-space bounds
  const viewMinX = -transform.offsetX / transform.scale;
  const viewMinY = -transform.offsetY / transform.scale;
  const viewMaxX = (width - transform.offsetX) / transform.scale;
  const viewMaxY = (height - transform.offsetY) / transform.scale;
  const margin = 50 / transform.scale;

  const isVisible = (x: number, y: number, r: number = 0) =>
    x + r >= viewMinX - margin &&
    x - r <= viewMaxX + margin &&
    y + r >= viewMinY - margin &&
    y - r <= viewMaxY + margin;

  const isEdgeVisible = (from: ClusterLayoutNode, to: ClusterLayoutNode) => {
    if (isVisible(from.x, from.y, from.radius)) return true;
    if (isVisible(to.x, to.y, to.radius)) return true;
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    return isVisible(midX, midY);
  };

  // 1. Filter visible elements
  const visibleNodes = layout.filter((node) => isVisible(node.x, node.y, node.radius));

  const edgePasses = focusId
    ? edges.filter((edge) => isEdgeActive(edge, { hoverNodeId, selectedNodeId, neighborIds }))
    : edges;

  // Apply semantic zoom edge pruning only when no node is focused
  let minWeightThreshold = 0;
  if (focusId === null && edges.length > 1500) {
    minWeightThreshold = Math.max(0, 0.22 * (1.0 - transform.scale));
  }

  const visibleEdges: Array<{
    from: ClusterLayoutNode;
    to: ClusterLayoutNode;
    weight: number;
    highlighted: boolean;
    endpointActive: boolean;
  }> = [];

  // Cap the number of drawn edges to ensure a hard performance ceiling (60fps) under heavy density
  const edgeBudget = focusId ? 250 : 1000;
  let drawnCount = 0;

  for (const edge of edgePasses) {
    if (drawnCount >= edgeBudget) break;

    const from = nodeMap.get(edge.fromId);
    const to = nodeMap.get(edge.toId);

    if (!from || !to) continue;

    const weight = (edge.probability * edge.count) / maxEdgeStrength;
    // Skip thinnest edges during semantic zoom
    if (minWeightThreshold > 0 && weight < minWeightThreshold) continue;

    if (!isEdgeVisible(from, to)) continue;

    const highlighted = focusId !== null && (edge.fromId === focusId || edge.toId === focusId);
    const endpointActive =
      !focusId || (neighborIds?.has(edge.fromId) && neighborIds?.has(edge.toId));

    visibleEdges.push({
      from,
      to,
      weight,
      highlighted,
      endpointActive,
    });

    drawnCount++;
  }

  // 2. Batch edges by style
  const edgeBatches = new Map<
    string,
    {
      strokeStyle: string;
      lineWidth: number;
      edges: Array<{ from: ClusterLayoutNode; to: ClusterLayoutNode }>;
    }
  >();

  for (const edge of visibleEdges) {
    // Round weight to 5 buckets for caching and batching
    const roundedWeight = Math.round(edge.weight * 4) / 4;
    const alpha =
      (edge.highlighted
        ? 0.35 + Math.pow(edge.weight, 1.5) * 0.55
        : edge.endpointActive
          ? edgeAlphaBase + roundedWeight * 0.35
          : edgeAlphaBase * 0.35) * 0.5;

    const strokeStyle = getMixedColorWithAlpha(
      edge.from.groupColor,
      edge.to.groupColor,
      0.5,
      alpha,
    );

    const lineWidth = edge.highlighted
      ? Math.max(0.6, (0.6 + Math.pow(edge.weight, 1.5) * 3.5) / transform.scale)
      : edgeDetail === "near"
        ? Math.max(0.5, (0.5 + roundedWeight * 2.5) / transform.scale)
        : Math.max(0.3, (0.35 + roundedWeight * 1.0) / transform.scale);

    const key = `${strokeStyle}|${lineWidth.toFixed(2)}`;
    let batch = edgeBatches.get(key);
    if (!batch) {
      batch = { strokeStyle, lineWidth, edges: [] };
      edgeBatches.set(key, batch);
    }
    batch.edges.push(edge);
  }

  // Render edges with additive blending
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";

  for (const batch of edgeBatches.values()) {
    context.strokeStyle = batch.strokeStyle;
    context.lineWidth = batch.lineWidth;
    context.beginPath();

    for (const { from, to } of batch.edges) {
      if (edgeDetail === "far") {
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
      } else {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 1.5) continue;

        const nx = dx / distance;
        const ny = dy / distance;
        const px = -ny;
        const py = nx;
        const bend = Math.min(48, distance * 0.18);
        const startX = from.x + nx * from.radius * 0.9;
        const startY = from.y + ny * from.radius * 0.9;
        const endX = to.x - nx * to.radius * 0.9;
        const endY = to.y - ny * to.radius * 0.9;
        const ctrlX = (startX + endX) / 2 + px * bend;
        const ctrlY = (startY + endY) / 2 + py * bend;

        context.moveTo(startX, startY);
        context.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
      }
    }
    context.stroke();
  }

  // 3. Batch nodes
  context.globalCompositeOperation = "source-over";

  const glowBatches = new Map<
    string,
    {
      fillStyle: string;
      nodes: Array<{ x: number; y: number; r: number }>;
    }
  >();

  const coreBatches = new Map<
    string,
    {
      fillStyle: string;
      nodes: Array<{ x: number; y: number; r: number }>;
    }
  >();

  for (const node of visibleNodes) {
    const selected = node.id === selectedNodeId;
    const highlighted = node.id === hoverNodeId || node.id === selectedNodeId;
    const active = !focusId || (neighborIds?.has(node.id) ?? false);

    const radius = Math.max(selected ? node.radius + 1.5 : node.radius, 2 / transform.scale);

    // Glow halo
    const glowAlpha = highlighted ? 0.45 : active ? 0.2 : 0.06;
    if (glowAlpha > 0.02) {
      const fillStyle = getColorWithAlpha(node.groupColor, glowAlpha * 0.45);
      const glowRadius = radius + (highlighted ? 10 : 5) / transform.scale;

      let batch = glowBatches.get(fillStyle);
      if (!batch) {
        batch = { fillStyle, nodes: [] };
        glowBatches.set(fillStyle, batch);
      }
      batch.nodes.push({ x: node.x, y: node.y, r: glowRadius });
    }

    // Core
    const coreAlpha = active ? 1 : 0.22;
    const coreFillStyle = getColorWithAlpha(node.groupColor, coreAlpha);

    let batch = coreBatches.get(coreFillStyle);
    if (!batch) {
      batch = { fillStyle: coreFillStyle, nodes: [] };
      coreBatches.set(coreFillStyle, batch);
    }
    batch.nodes.push({ x: node.x, y: node.y, r: radius });
  }

  // Draw glows
  for (const batch of glowBatches.values()) {
    context.fillStyle = batch.fillStyle;
    context.beginPath();
    for (const { x, y, r } of batch.nodes) {
      context.moveTo(x + r, y);
      context.arc(x, y, r, 0, Math.PI * 2);
    }
    context.fill();
  }

  // Draw cores
  for (const batch of coreBatches.values()) {
    context.fillStyle = batch.fillStyle;
    context.beginPath();
    for (const { x, y, r } of batch.nodes) {
      context.moveTo(x + r, y);
      context.arc(x, y, r, 0, Math.PI * 2);
    }
    context.fill();
  }

  // 4. Highlighted/selected borders
  for (const node of visibleNodes) {
    const selected = node.id === selectedNodeId;
    const highlighted = node.id === hoverNodeId || node.id === selectedNodeId;

    if (selected || highlighted) {
      const radius = Math.max(selected ? node.radius + 1.5 : node.radius, 2 / transform.scale);

      context.beginPath();
      context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      context.strokeStyle = selected
        ? palette.nodeSelectedStroke
        : getColorWithAlpha(node.groupColor, 0.95);
      context.lineWidth = Math.max(0.7, (selected ? 2 : 1.3) / transform.scale);
      context.stroke();
    }
  }

  // 5. Crisp screen-space labels for focused node and top 20 neighbors
  if (focusId) {
    context.save();
    // Reset transform to draw crisp screen-space text
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    context.textAlign = "center";
    context.textBaseline = "middle";

    // Build a map of neighbor ID -> edge details
    const neighborDetails = new Map<string, { count: number; probability: number }>();

    // Find all edges connected to the focusId and record their details
    for (const edge of edges) {
      if (edge.fromId === focusId) {
        const existing = neighborDetails.get(edge.toId);
        if (!existing || edge.count > existing.count) {
          neighborDetails.set(edge.toId, { count: edge.count, probability: edge.probability });
        }
      } else if (edge.toId === focusId) {
        const existing = neighborDetails.get(edge.fromId);
        if (!existing || edge.count > existing.count) {
          neighborDetails.set(edge.fromId, { count: edge.count, probability: edge.probability });
        }
      }
    }

    // Sort neighbors by count descending and limit to top 20 to prevent lag and clutter
    const sortedNeighbors = [...neighborDetails.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([id]) => id);

    const neighborsToLabel = new Set<string>(sortedNeighbors);
    neighborsToLabel.add(focusId); // Always label the focused node itself

    for (const node of visibleNodes) {
      if (!neighborsToLabel.has(node.id)) continue;

      const isFocus = node.id === focusId;

      // Calculate screen position
      const screenX = node.x * transform.scale + transform.offsetX;
      const screenY = node.y * transform.scale + transform.offsetY;
      const radius = Math.max(
        node.id === selectedNodeId ? node.radius + 1.5 : node.radius,
        2 / transform.scale,
      );
      const screenRadius = radius * transform.scale;

      // Setup typography and styling
      if (isFocus) {
        context.font =
          "bold 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        context.fillStyle = palette.label;
      } else {
        context.font =
          "500 9px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        context.fillStyle = getColorWithAlpha(palette.label, 0.75);
      }

      // Add a clean drop-shadow for text readability over glows
      context.shadowColor = "rgba(0, 0, 0, 0.85)";
      context.shadowBlur = 4;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 1;

      // Draw the text offset below the node
      const textY = screenY + screenRadius + (isFocus ? 11 : 9);
      let labelText = node.label;
      if (!isFocus) {
        const detail = neighborDetails.get(node.id);
        if (detail) {
          const pct = Math.round(detail.probability * 100);
          labelText = `${node.label} (${pct}% · ${detail.count}×)`;
        }
      }
      context.fillText(labelText, screenX, textY);
    }
    context.restore();
  }

  context.restore();
};
