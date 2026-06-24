import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { selectMarkovGraphView, type MarkovGraph, type MarkovGraphEdge } from "@/lib/markov-graph";
import { drawForceGraph } from "@/lib/markov-graph-render";
import { layoutForceGraph } from "@/lib/markov-force-layout";
import { detectVibeGroups, type ClusterLayoutNode, type VibeGroup } from "@/lib/markov-vibe-groups";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/utils/format";

type CanvasPalette = {
  background: string;
  label: string;
  nodeSelectedStroke: string;
};

type MarkovGraphCanvasProps = {
  className?: string;
  graph: MarkovGraph;
  minEdgeCount: number;
  searchQuery: string;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onGroupsChange?: (groups: VibeGroup[]) => void;
};

export const MarkovGraphCanvas = ({
  className,
  graph,
  minEdgeCount,
  searchQuery,
  selectedNodeId,
  onSelectNode,
  onGroupsChange,
}: MarkovGraphCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<ClusterLayoutNode[]>([]);
  const edgesRef = useRef<MarkovGraphEdge[]>([]);
  const membershipRef = useRef<Map<string, number>>(new Map());
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const hoverRef = useRef<string | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const dragRef = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
  });
  const sizeRef = useRef({ width: 0, height: 0 });
  const frameRef = useRef<number | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [isLayouting, setIsLayouting] = useState(false);
  const [groupCount, setGroupCount] = useState(0);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  const graphView = useMemo(
    () =>
      selectMarkovGraphView(graph.edges, minEdgeCount, {
        searchQuery,
      }),
    [graph.edges, minEdgeCount, searchQuery],
  );

  const visibleNodes = useMemo(
    () => graph.nodes.filter((node) => graphView.nodeIds.has(node.id)),
    [graph.nodes, graphView.nodeIds],
  );

  const graphCommunities = useMemo(() => {
    const { groups, membership } = detectVibeGroups(visibleNodes, graphView.edges, {
      clusterMinCount: minEdgeCount,
    });

    return { groups, membership };
  }, [graphView.edges, minEdgeCount, visibleNodes]);

  useEffect(() => {
    onGroupsChange?.(graphCommunities.groups);
    setGroupCount(graphCommunities.groups.length);
    membershipRef.current = graphCommunities.membership;
    edgesRef.current = graphView.edges;

    if (visibleNodes.length === 0) {
      layoutRef.current = [];
      setIsLayouting(false);
      setLayoutVersion((value) => value + 1);
      return;
    }

    let cancelled = false;
    setIsLayouting(true);

    void layoutForceGraph(
      visibleNodes,
      graphView.edges,
      graphCommunities.membership,
      graphCommunities.groups,
    ).then((layout) => {
      if (cancelled) return;

      layoutRef.current = layout;
      setIsLayouting(false);
      setLayoutVersion((value) => value + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [graphCommunities, graphView.edges, onGroupsChange, visibleNodes]);

  const readPalette = useCallback((): CanvasPalette => {
    const style = getComputedStyle(document.documentElement);

    return {
      background: style.getPropertyValue("--card").trim() || "#111214",
      label: style.getPropertyValue("--foreground").trim() || "#f7f8f8",
      nodeSelectedStroke: style.getPropertyValue("--primary").trim() || "#3b82f6",
    };
  }, []);

  const readContainerSize = useCallback(() => {
    const container = containerRef.current;

    if (!container) return null;

    return {
      width: container.clientWidth,
      height: container.clientHeight,
    };
  }, []);

  const fitGraphToView = useCallback(
    (layout: ClusterLayoutNode[]) => {
      const size = readContainerSize();

      if (!size || layout.length === 0) return false;

      if (size.width < 8 || size.height < 8) return false;

      const padding = 64;
      const xs = layout.map((node) => node.x);
      const ys = layout.map((node) => node.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const width = Math.max(80, maxX - minX);
      const height = Math.max(80, maxY - minY);
      const scale = Math.min(
        (size.width - padding * 2) / width,
        (size.height - padding * 2) / height,
      );
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      transformRef.current = {
        scale: clamp(scale, 0.08, 4),
        offsetX: size.width / 2 - centerX * scale,
        offsetY: size.height / 2 - centerY * scale,
      };

      return true;
    },
    [readContainerSize],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    drawForceGraph(
      canvas,
      layoutRef.current,
      edgesRef.current,
      transformRef.current,
      selectedNodeId,
      hoverRef.current,
      readPalette(),
    );
  }, [readPalette, selectedNodeId]);

  const scheduleRedraw = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      redraw();
    });
  }, [redraw]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();

    if (!rect) return { x: 0, y: 0 };

    const transform = transformRef.current;

    return {
      x: (clientX - rect.left - transform.offsetX) / transform.scale,
      y: (clientY - rect.top - transform.offsetY) / transform.scale,
    };
  };

  const worldToScreen = (x: number, y: number) => {
    const transform = transformRef.current;

    return {
      x: x * transform.scale + transform.offsetX,
      y: y * transform.scale + transform.offsetY,
    };
  };

  const findNodeAt = (x: number, y: number) => {
    const layout = layoutRef.current;
    const transform = transformRef.current;

    for (let index = layout.length - 1; index >= 0; index -= 1) {
      const node = layout[index];

      if (!node) continue;

      const hitRadius = Math.max(node.radius + 2, 5 / Math.max(transform.scale, 0.12));
      const distance = Math.hypot(node.x - x, node.y - y);

      if (distance <= hitRadius) return node;
    }

    return null;
  };

  const updateHover = useCallback(
    (clientX: number, clientY: number, forceUpdatePosition = false) => {
      const world = screenToWorld(clientX, clientY);
      const node = findNodeAt(world.x, world.y);
      const nextId = node?.id ?? null;

      if (hoverRef.current === nextId && !forceUpdatePosition) return;

      hoverRef.current = nextId;
      setHoverNodeId(nextId);

      if (node) {
        const screen = worldToScreen(node.x, node.y);
        setTooltip({
          x: screen.x,
          y: screen.y - node.radius * transformRef.current.scale - 10,
          label: node.label,
        });
      } else {
        setTooltip(null);
      }

      scheduleRedraw();
    },
    [scheduleRedraw],
  );

  useEffect(() => {
    if (layoutRef.current.length === 0) return;

    sizeRef.current = { width: 0, height: 0 };
    fitGraphToView(layoutRef.current);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion]);

  useEffect(() => {
    scheduleRedraw();
  }, [hoverNodeId, scheduleRedraw, selectedNodeId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width < 1 || height < 1) return;

      if (width === sizeRef.current.width && height === sizeRef.current.height) return;

      sizeRef.current = { width, height };

      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));

      if (layoutRef.current.length > 0) {
        fitGraphToView(layoutRef.current);
      }

      redraw();
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [fitGraphToView, redraw]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const transform = transformRef.current;
      const bounds = container.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      const worldX = (pointerX - transform.offsetX) / transform.scale;
      const worldY = (pointerY - transform.offsetY) / transform.scale;
      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.91;
      const nextScale = clamp(transform.scale * zoomFactor, 0.08, 8);

      transform.scale = nextScale;
      transform.offsetX = pointerX - worldX * nextScale;
      transform.offsetY = pointerY - worldY * nextScale;
      scheduleRedraw();

      updateHover(event.clientX, event.clientY, true);
    };

    container.addEventListener("wheel", onWheel, { passive: false });

    return () => container.removeEventListener("wheel", onWheel);
  }, [scheduleRedraw, updateHover]);

  useEffect(() => {
    const handleBlur = () => {
      dragRef.current.active = false;
      hoverRef.current = null;
      setHoverNodeId(null);
      setTooltip(null);
      scheduleRedraw();
    };

    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [scheduleRedraw]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  const hasLayout = layoutRef.current.length > 0;
  const focusId = selectedNodeId ?? hoverNodeId;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate w-full max-w-full overflow-hidden overscroll-contain rounded-lg border border-border bg-card",
        className,
      )}
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full max-w-full touch-none"
        onPointerDown={(event) => {
          const canvas = canvasRef.current;

          if (!canvas) return;

          canvas.setPointerCapture(event.pointerId);
          dragRef.current = {
            active: true,
            lastX: event.clientX,
            lastY: event.clientY,
            startX: event.clientX,
            startY: event.clientY,
          };

          setTooltip(null);
          hoverRef.current = null;
          setHoverNodeId(null);
          scheduleRedraw();
        }}
        onPointerMove={(event) => {
          if (dragRef.current.active) {
            const transform = transformRef.current;
            transform.offsetX += event.clientX - dragRef.current.lastX;
            transform.offsetY += event.clientY - dragRef.current.lastY;
            dragRef.current.lastX = event.clientX;
            dragRef.current.lastY = event.clientY;
            scheduleRedraw();
            return;
          }

          const cx = event.clientX;
          const cy = event.clientY;
          if (hoverRafRef.current === null) {
            hoverRafRef.current = requestAnimationFrame(() => {
              hoverRafRef.current = null;
              updateHover(cx, cy);
            });
          }
        }}
        onPointerLeave={() => {
          if (dragRef.current.active) return;

          hoverRef.current = null;
          setHoverNodeId(null);
          setTooltip(null);
          scheduleRedraw();
        }}
        onPointerUp={(event) => {
          const canvas = canvasRef.current;
          const wasDragging =
            Math.abs(event.clientX - dragRef.current.startX) > 4 ||
            Math.abs(event.clientY - dragRef.current.startY) > 4;

          dragRef.current.active = false;

          if (canvas?.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }

          if (!wasDragging) {
            const world = screenToWorld(event.clientX, event.clientY);
            const node = findNodeAt(world.x, world.y);

            onSelectNode(node?.id === selectedNodeId ? null : (node?.id ?? null));
          }

          updateHover(event.clientX, event.clientY, true);
        }}
        onPointerCancel={() => {
          dragRef.current.active = false;
          hoverRef.current = null;
          setHoverNodeId(null);
          setTooltip(null);
          scheduleRedraw();
        }}
        onLostPointerCapture={() => {
          if (dragRef.current.active) {
            dragRef.current.active = false;
            scheduleRedraw();
          }
        }}
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-48 -translate-x-1/2 -translate-y-full rounded-md bg-background/95 px-2 py-1 text-[10px] font-medium text-foreground shadow-md backdrop-blur-sm"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.label}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
        <div className="rounded-md bg-background/80 px-3 py-1 text-center text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
          {isLayouting
            ? `Laying out ${visibleNodes.length.toLocaleString()} artists · ${graphView.edges.length.toLocaleString()} switches…`
            : `${formatCompact(visibleNodes.length)} artists · ${formatCompact(graphView.edges.length)} switches · ${groupCount} groups${focusId ? " · click background to clear" : ""}`}
        </div>
      </div>
      {!isLayouting && !hasLayout && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
          No connections match the current filters.
        </div>
      )}
      {!isLayouting && graphView.capped && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <div className="max-w-lg rounded-md bg-background/80 px-3 py-1.5 text-center text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
            Showing {graphView.edges.length.toLocaleString()} of{" "}
            {graphView.totalMatching.toLocaleString()} matching switches.
          </div>
        </div>
      )}
    </div>
  );
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
