import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  DatabaseIcon,
  DownloadIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  RefreshCcwIcon,
  ScanSearchIcon,
  SquareIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react";
import { type CSSProperties, type SubmitEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clearCachedStatsForUser,
  markAbandonedSyncStopped,
  normalizeUsername,
  statsSnapshotsCollection,
  type LastFmPeriod,
  type LastFmStatsSnapshot,
} from "@/lib/lastfm-stats-cache";
import {
  hydrateStatsSnapshotFromCache,
  syncLastFmStats,
  type LastFmSyncMode,
} from "@/lib/lastfm-stats-sync";
import { exportScrobblesToCsv, ScrobbleCsvExportError } from "@/lib/scrobbles-csv-export";
import { formatRelativeTime } from "@/utils/format";

import { AnalyticsSection } from "./analytics-section";
import { CompareWorkspace } from "./compare-workspace";
import { DashboardProvider, useDashboardSnapshot } from "./dashboard-context";
import { FriendsRow } from "./friends-row";
import { ListeningRhythmPanel } from "./listening-rhythm-panel";
import { Rankings } from "./rankings";
import { RecentPlays } from "./recent-plays";
import { SyncBar } from "./sync-bar";
import { ScrobbleExportBar } from "./scrobble-export-bar";
import { ItemDetailOverlay } from "./item-detail-page";
import { ItemDetailProvider } from "./item-detail-context";
import { MarkovGraphOverlay } from "./markov-graph-overlay";
import { MarkovGraphProvider } from "./markov-graph-context";
import { UserHeader } from "./user-header";

const LAST_USERNAME_KEY = "scrobbling-away:lastfm-username";

function snapshotHasCachedData(snapshot: LastFmStatsSnapshot | undefined) {
  return (
    Boolean(snapshot?.profile) ||
    (snapshot?.counts.recentTracks ?? 0) > 0 ||
    (snapshot?.counts.friends ?? 0) > 0 ||
    (snapshot?.counts.topArtists.overall ?? 0) > 0
  );
}

export function StatsWorkspace() {
  const [username, setUsername] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const [syncingUsername, setSyncingUsername] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<LastFmPeriod>("overall");
  const [isSyncing, setIsSyncing] = useState(false);
  const [exportState, setExportState] = useState<{
    rowsWritten: number;
    bytesWritten: number;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const syncTarget = username.trim() || selectedUsername;

  const selectedUsernameLower = selectedUsername ? normalizeUsername(selectedUsername) : "";
  const snapshotQuery = useLiveQuery(
    (query) =>
      selectedUsernameLower
        ? query
            .from({ snapshot: statsSnapshotsCollection })
            .where(({ snapshot }) => eq(snapshot.id, selectedUsernameLower))
        : undefined,
    [selectedUsernameLower],
  );
  const snapshot = Array.isArray(snapshotQuery.data) ? snapshotQuery.data[0] : undefined;

  const syncTargetLower = syncTarget ? normalizeUsername(syncTarget) : "";
  const syncTargetSnapshotQuery = useLiveQuery(
    (query) =>
      syncTargetLower
        ? query
            .from({ snapshot: statsSnapshotsCollection })
            .where(({ snapshot }) => eq(snapshot.id, syncTargetLower))
        : undefined,
    [syncTargetLower],
  );
  const syncTargetSnapshot = Array.isArray(syncTargetSnapshotQuery.data)
    ? syncTargetSnapshotQuery.data[0]
    : undefined;

  const syncingUsernameLower = syncingUsername ? normalizeUsername(syncingUsername) : "";
  const syncingSnapshotQuery = useLiveQuery(
    (query) =>
      syncingUsernameLower && isSyncing
        ? query
            .from({ snapshot: statsSnapshotsCollection })
            .where(({ snapshot }) => eq(snapshot.id, syncingUsernameLower))
        : undefined,
    [syncingUsernameLower, isSyncing],
  );
  const syncingSnapshot = Array.isArray(syncingSnapshotQuery.data)
    ? syncingSnapshotQuery.data[0]
    : undefined;

  const syncBarSnapshot = isSyncing ? syncingSnapshot : syncTargetSnapshot;
  const hasCachedData = snapshotHasCachedData(syncTargetSnapshot);
  const canResumeSync =
    !isSyncing &&
    Boolean(syncTarget) &&
    (syncTargetSnapshot?.sync?.status === "stopped" ||
      syncTargetSnapshot?.sync?.status === "error" ||
      (syncTargetSnapshot && !hasCachedData));

  useEffect(() => {
    void statsSnapshotsCollection.preload();

    const lastUsername = window.localStorage.getItem(LAST_USERNAME_KEY);

    if (!lastUsername) return;

    setUsername(lastUsername);
    setSelectedUsername(lastUsername);
    void (async () => {
      await markAbandonedSyncStopped(lastUsername);
      await hydrateStatsSnapshotFromCache(lastUsername);
    })();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      exportAbortRef.current?.abort();
    };
  }, []);

  const startSync = async (nextUsername: string, mode: LastFmSyncMode = "deep") => {
    if (!nextUsername) {
      toast.error("Enter a Last.fm username.");
      return;
    }

    setIsSyncing(true);
    setSyncingUsername(nextUsername);
    abortRef.current?.abort();

    const controller = new AbortController();

    abortRef.current = controller;

    try {
      await hydrateStatsSnapshotFromCache(nextUsername);
      await syncLastFmStats(nextUsername, {
        mode,
        includeRecentTracks: true,
        signal: controller.signal,
      });
      window.localStorage.setItem(LAST_USERNAME_KEY, nextUsername);
      setSelectedUsername(nextUsername);
      toast.success(mode === "quick" ? "New scrobbles synced." : "Full sync complete.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";

      toast.error(message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;

      setIsSyncing(false);
      setSyncingUsername("");
    }
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mode: LastFmSyncMode = canResumeSync ? "deep" : hasCachedData ? "quick" : "deep";
    void startSync(syncTarget, mode);
  };

  const handleRefreshCache = async () => {
    const nextUsername = syncTarget;

    if (!nextUsername) {
      toast.error("Enter a Last.fm username.");
      return;
    }

    await markAbandonedSyncStopped(nextUsername);
    await hydrateStatsSnapshotFromCache(nextUsername);
    toast.success("Stats reloaded.");
  };

  const handleExportScrobbles = async () => {
    const nextUsername = syncTarget;

    if (!nextUsername) {
      toast.error("Enter a Last.fm username.");
      return;
    }

    if ((syncTargetSnapshot?.counts.recentTracks ?? 0) === 0) {
      toast.error("No scrobbles to export.");
      return;
    }

    exportAbortRef.current?.abort();

    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportState({ rowsWritten: 0, bytesWritten: 0 });

    try {
      const result = await exportScrobblesToCsv({
        usernameLower: normalizeUsername(nextUsername),
        username: nextUsername,
        signal: controller.signal,
        onProgress: (progress) => {
          setExportState(progress);
        },
      });
      toast.success(`Exported ${result.rowsWritten.toLocaleString()} scrobbles.`);
    } catch (error) {
      if (error instanceof ScrobbleCsvExportError && error.code === "cancelled") {
        toast.message("Export cancelled.");
        return;
      }

      const message =
        error instanceof ScrobbleCsvExportError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Export failed.";

      toast.error(message);
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
      }

      setExportState(null);
    }
  };

  const handleClearCache = async () => {
    const nextUsername = syncTarget;

    if (!nextUsername) {
      toast.error("Enter a Last.fm username.");
      return;
    }

    abortRef.current?.abort();
    await clearCachedStatsForUser(nextUsername);
    if (normalizeUsername(nextUsername) === selectedUsernameLower) {
      window.localStorage.removeItem(LAST_USERNAME_KEY);
      setSelectedUsername("");
    }
    toast.success("Stats cleared.");
  };

  return (
    <main>
      <div className="mx-auto flex w-full max-w-[960px] flex-col px-5 py-10">
        <ItemDetailProvider>
          <MarkovGraphProvider>
            <Tabs defaultValue="stats">
              <TabsList variant="line" className="mb-6">
                <TabsTrigger value="stats">Your stats</TabsTrigger>
                <TabsTrigger value="compare">Compare</TabsTrigger>
              </TabsList>
              <TabsContent value="stats" className="text-base/normal">
                {/* Search + sync */}
                <section className="animate-section-in motion-reduce:animate-none grid gap-4">
                  <form
                    className="mx-auto flex w-full max-w-md items-center gap-1.5 rounded-lg border border-border/60 p-1"
                    onSubmit={handleSubmit}
                  >
                    <Input
                      className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-none focus-visible:ring-offset-0 pl-3 h-7 text-xs"
                      placeholder="Last.fm username"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    {isSyncing ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 px-3.5 text-[11px]"
                        onClick={() => abortRef.current?.abort()}
                      >
                        <SquareIcon className="size-3.5" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={!syncTarget || syncTargetSnapshotQuery.isLoading}
                        className="h-7 px-4 text-[11px] font-medium"
                      >
                        {syncTargetSnapshotQuery.isLoading ? (
                          <LoaderCircleIcon className="size-3.5 animate-spin" />
                        ) : canResumeSync ? (
                          <DownloadIcon className="size-3.5" />
                        ) : hasCachedData ? (
                          <ZapIcon className="size-3.5" />
                        ) : (
                          <DownloadIcon className="size-3.5" />
                        )}
                        <span className="ml-1">
                          {canResumeSync ? "Resume" : hasCachedData ? "Quick sync" : "Sync"}
                        </span>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-7 shrink-0"
                          />
                        }
                      >
                        <MoreHorizontalIcon className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Local data</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => void handleRefreshCache()}>
                            <RefreshCcwIcon className="size-4" />
                            Reload from IndexedDB
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!syncTarget}
                            onClick={() => void startSync(syncTarget, "quick")}
                          >
                            <ZapIcon className="size-4" />
                            Quick sync
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!syncTarget}
                            onClick={() => void startSync(syncTarget, "deep")}
                          >
                            <ScanSearchIcon className="size-4" />
                            Deep sync
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              exportState !== null ||
                              !syncTarget ||
                              (syncTargetSnapshot?.counts.recentTracks ?? 0) === 0
                            }
                            onClick={() => void handleExportScrobbles()}
                          >
                            <DownloadIcon className="size-4" />
                            Download scrobbles (.csv)
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!syncTarget}
                          onClick={() => void handleClearCache()}
                        >
                          <Trash2Icon className="size-4" />
                          Clear this user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </form>
                  {(isSyncing ||
                    syncTargetSnapshotQuery.isLoading ||
                    (syncBarSnapshot?.sync &&
                      syncBarSnapshot.sync.status !== "complete" &&
                      syncBarSnapshot.sync.status !== "idle")) && (
                    <div className="mx-auto w-full max-w-md rounded-md">
                      <SyncBar
                        isLoading={
                          isSyncing ||
                          syncTargetSnapshotQuery.isLoading ||
                          syncingSnapshotQuery.isLoading
                        }
                        snapshot={syncBarSnapshot}
                      />
                    </div>
                  )}
                  {exportState && (
                    <div className="mx-auto w-full max-w-md rounded-md">
                      <ScrobbleExportBar
                        rowsWritten={exportState.rowsWritten}
                        bytesWritten={exportState.bytesWritten}
                        onCancel={() => exportAbortRef.current?.abort()}
                      />
                    </div>
                  )}
                  {syncTargetSnapshot && (
                    <div className="mx-auto flex w-full max-w-md flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-border/60 px-4 py-1.5 text-[11px] text-muted-foreground/80">
                      <DatabaseIcon className="size-3 text-muted-foreground/60" />
                      <span>
                        {syncTargetSnapshot.counts.recentTracks.toLocaleString()} scrobbles
                      </span>
                      <span className="h-full w-px bg-border/60" />
                      <span>
                        {syncTargetSnapshot.counts.topArtists.overall.toLocaleString()} ranked
                        artists
                      </span>
                      <span className="h-full w-px bg-border/60" />
                      <span>{syncTargetSnapshot.counts.friends.toLocaleString()} friends</span>
                      <span className="h-full w-px bg-border/60" />
                      <span>Updated {formatRelativeTime(syncTargetSnapshot.updatedAt)}</span>
                    </div>
                  )}
                </section>

                {/* Loading state */}
                {selectedUsername && !snapshot && (
                  <div className="animate-section-in motion-reduce:animate-none flex w-full max-w-md flex-col rounded-md items-center py-20 text-center">
                    <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">Loading your music…</p>
                  </div>
                )}

                {/* Dashboard */}
                {snapshot && (
                  <DashboardProvider
                    snapshot={snapshot}
                    selectedPeriod={selectedPeriod}
                    setSelectedPeriod={setSelectedPeriod}
                  >
                    <Dashboard />
                    <MarkovGraphOverlay />
                  </DashboardProvider>
                )}
              </TabsContent>
              <TabsContent value="compare" className="text-base/normal">
                <CompareWorkspace />
              </TabsContent>
            </Tabs>
            <ItemDetailOverlay />
          </MarkovGraphProvider>
        </ItemDetailProvider>
      </div>
    </main>
  );
}

function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={cn(
        "animate-section-in motion-reduce:animate-none border-t border-border/40 pt-10",
        className,
      )}
      style={{ animationDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </section>
  );
}

function Dashboard() {
  return (
    <div className="mt-6 pb-10">
      <AnimatedSection className="border-t-0 pt-0" delay={0}>
        <UserHeader />
      </AnimatedSection>

      <AnimatedSection delay={60}>
        <ListeningRhythmPanel layout="dashboard" />
      </AnimatedSection>

      <AnimatedSection delay={180}>
        <AnalyticsSection />
      </AnimatedSection>

      <AnimatedSection delay={240}>
        <Rankings />
      </AnimatedSection>

      <AnimatedSection delay={300}>
        <RecentPlays />
      </AnimatedSection>

      <FriendsSection />
    </div>
  );
}

function FriendsSection() {
  const snapshot = useDashboardSnapshot();

  if (snapshot.friends.length === 0) return null;

  return (
    <AnimatedSection delay={360}>
      <FriendsRow />
    </AnimatedSection>
  );
}
