import { LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildSessionMarkovGraph, filterMarkovEdges, type MarkovGraph } from "@/lib/markov-graph";
import { lastFmStatsDb } from "@/lib/lastfm-stats-cache";
import { formatCompact, formatPercent } from "@/utils/format";

import { useDashboardSnapshot } from "./dashboard-context";
import type { VibeGroup } from "@/lib/markov-vibe-groups";

import { MarkovGraphCanvas } from "./markov-graph-canvas";
import { useMarkovGraph } from "./markov-graph-context";
import { MarkovVibeLegend } from "./markov-vibe-legend";
import { SubpageShell } from "./subpage-shell";
import { VirtualList } from "./virtual-list";

export const MarkovGraphOverlay = () => {
  const { closeMarkovGraph, isOpen } = useMarkovGraph();

  if (!isOpen) return null;

  return (
    <SubpageShell onBack={closeMarkovGraph} title="Artist switch map">
      <MarkovGraphContent />
    </SubpageShell>
  );
};

const MarkovGraphContent = () => {
  const snapshot = useDashboardSnapshot();
  const [graph, setGraph] = useState<MarkovGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [minEdgeCount, setMinEdgeCount] = useState(2);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [vibeGroups, setVibeGroups] = useState<VibeGroup[]>([]);
  const deferredSearch = useDeferredValue(searchQuery);
  const deferredMinEdgeCount = useDeferredValue(minEdgeCount);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    setGraph(null);
    setSelectedNodeId(null);

    void (async () => {
      try {
        const tracks = await lastFmStatsDb.recentTracks
          .where("usernameLower")
          .equals(snapshot.usernameLower)
          .sortBy("playedAtTimestamp");

        if (cancelled) return;

        setGraph(buildSessionMarkovGraph(tracks));
      } catch {
        if (cancelled) return;

        setError("Could not build switch map.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [snapshot.usernameLower]);

  const filteredEdges = useMemo(() => {
    if (!graph) return [];

    return filterMarkovEdges(graph.edges, deferredMinEdgeCount, deferredSearch);
  }, [deferredMinEdgeCount, deferredSearch, graph]);

  const selectedNode = graph?.nodes.find((node) => node.id === selectedNodeId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Building map…</p>
      </div>
    );
  }

  if (error || !graph) {
    return <div className="py-20 text-center text-sm text-muted-foreground">{error}</div>;
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-5 overflow-x-hidden">
      <p className="text-sm text-muted-foreground">
        Linked artists in the same session, colored by group. Layout is force-directed — connected
        artists pull together, groups form clusters. Scroll to zoom, drag to pan, click to
        highlight.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Artists" value={formatCompact(graph.nodes.length)} />
        <StatCard label="Transitions" value={formatCompact(graph.edges.length)} />
        <StatCard
          label="Groups"
          value={formatCompact(vibeGroups.length)}
          detail={`${minEdgeCount}+ switches to group`}
        />
        <StatCard
          label="Selected"
          value={selectedNode?.label ?? "—"}
          detail={selectedNode ? `${formatCompact(selectedNode.outTransitions)} outgoing` : "None"}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="sm:max-w-sm"
          placeholder="Search artist…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <label className="flex min-w-0 flex-1 items-center gap-3 text-xs text-muted-foreground">
          <span className="shrink-0">Min switches</span>
          <input
            className="w-full accent-primary"
            max={10}
            min={1}
            step={1}
            type="range"
            value={minEdgeCount}
            onChange={(event) => setMinEdgeCount(Number(event.target.value))}
          />
          <span className="w-6 shrink-0 font-mono tabular-nums">{minEdgeCount}</span>
        </label>
        {selectedNodeId && (
          <Button size="sm" type="button" variant="outline" onClick={() => setSelectedNodeId(null)}>
            <RotateCcwIcon />
            Clear selection
          </Button>
        )}
      </div>

      <MarkovGraphCanvas
        className="h-[min(56vh,36rem)] min-h-72 shrink-0"
        graph={graph}
        minEdgeCount={deferredMinEdgeCount}
        searchQuery={deferredSearch}
        selectedNodeId={selectedNodeId}
        onGroupsChange={setVibeGroups}
        onSelectNode={setSelectedNodeId}
      />

      {vibeGroups.length > 0 && (
        <div className="grid gap-2">
          <div className="text-xs text-muted-foreground">Groups</div>
          <MarkovVibeLegend groups={vibeGroups} />
        </div>
      )}

      <div className="grid gap-2">
        <div className="text-xs text-muted-foreground">
          All transitions ({formatCompact(filteredEdges.length)})
        </div>
        <VirtualList
          estimateSize={44}
          height="min(28rem, 40vh)"
          items={filteredEdges}
          getItemKey={(edge) => `${edge.fromId}:${edge.toId}:${edge.count}`}
          renderItem={(edge) => (
            <button
              type="button"
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border/60 px-1 py-2 text-left text-xs transition-colors hover:bg-muted/40"
              onClick={() => setSelectedNodeId(edge.fromId)}
            >
              <span className="min-w-0 truncate">
                <span className="font-medium">{edge.fromLabel}</span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-medium">{edge.toLabel}</span>
              </span>
              <span className="font-mono text-muted-foreground tabular-nums">
                {formatCompact(edge.count)}× · {formatPercent(edge.probability)}
              </span>
            </button>
          )}
        />
      </div>
    </div>
  );
};

const StatCard = ({ detail, label, value }: { detail?: string; label: string; value: string }) => (
  <div className="rounded-md bg-muted/30 px-3 py-2">
    <div className="font-mono text-lg font-semibold tabular-nums">{value}</div>
    <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    {detail && <div className="truncate text-[11px] text-muted-foreground/80">{detail}</div>}
  </div>
);
