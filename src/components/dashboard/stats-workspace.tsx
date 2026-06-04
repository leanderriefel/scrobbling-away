import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  DatabaseIcon,
  DownloadIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  RefreshCcwIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { type CSSProperties, type SubmitEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import {
  clearCachedStatsForUser,
  markAbandonedSyncStopped,
  normalizeUsername,
  statsSnapshotsCollection,
  type LastFmPeriod,
} from "@/lib/lastfm-stats-cache";
import { hydrateStatsSnapshotFromCache, syncLastFmStats } from "@/lib/lastfm-stats-sync";

import { AnalyticsSection } from "./analytics-section";
import { DashboardProvider, useDashboardSnapshot } from "./dashboard-context";
import { FriendsRow } from "./friends-row";
import { ListeningClock } from "./listening-clock";
import { Rankings } from "./rankings";
import { RecentPlays } from "./recent-plays";
import { SyncBar } from "./sync-bar";
import { UserHeader } from "./user-header";
import { WeekdayChart } from "./weekday-chart";
import { YearChart } from "./year-chart";

const LAST_USERNAME_KEY = "scrobbling-away:lastfm-username";

export function StatsWorkspace() {
  const [username, setUsername] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<LastFmPeriod>("overall");
  const [isSyncing, setIsSyncing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
  const hasCachedData =
    Boolean(snapshot?.profile) ||
    (snapshot?.counts.recentTracks ?? 0) > 0 ||
    (snapshot?.counts.friends ?? 0) > 0 ||
    (snapshot?.counts.topArtists.overall ?? 0) > 0;
  const canResumeSync =
    !isSyncing &&
    Boolean(selectedUsername) &&
    (snapshot?.sync?.status === "stopped" ||
      snapshot?.sync?.status === "error" ||
      (snapshot && !hasCachedData));

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
    };
  }, []);

  const startSync = async (nextUsername: string) => {
    if (!nextUsername) {
      toast.error("Enter a Last.fm username.");
      return;
    }

    window.localStorage.setItem(LAST_USERNAME_KEY, nextUsername);
    setSelectedUsername(nextUsername);
    setIsSyncing(true);
    abortRef.current?.abort();

    const controller = new AbortController();

    abortRef.current = controller;

    try {
      await hydrateStatsSnapshotFromCache(nextUsername);
      await syncLastFmStats(nextUsername, {
        includeRecentTracks: true,
        signal: controller.signal,
      });
      toast.success("Your music data is ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";

      toast.error(message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;

      setIsSyncing(false);
    }
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void startSync(username.trim());
  };

  const handleRefreshCache = async () => {
    const nextUsername = selectedUsername || username.trim();

    if (!nextUsername) {
      toast.error("Enter a Last.fm username.");
      return;
    }

    await markAbandonedSyncStopped(nextUsername);
    await hydrateStatsSnapshotFromCache(nextUsername);
    toast.success("Loaded cached data.");
  };

  const handleClearCache = async () => {
    const nextUsername = selectedUsername || username.trim();

    if (!nextUsername) {
      toast.error("Enter a Last.fm username.");
      return;
    }

    abortRef.current?.abort();
    await clearCachedStatsForUser(nextUsername);
    window.localStorage.removeItem(LAST_USERNAME_KEY);
    setSelectedUsername("");
    toast.success("Cache cleared.");
  };

  return (
    <main className="overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[960px] flex-col px-5 py-6">
        {/* Search + sync */}
        <section className="section-in grid gap-3">
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <Input
              className="flex-1"
              placeholder="Last.fm username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {isSyncing ? (
              <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}>
                <SquareIcon className="size-4" />
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={snapshotQuery.isLoading}>
                {snapshotQuery.isLoading ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <DownloadIcon className="size-4" />
                )}
                {canResumeSync ? "Resume" : hasCachedData ? "Sync again" : "Sync"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="outline" size="icon" />}>
                <MoreHorizontalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Cache</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => void handleRefreshCache()}>
                    <RefreshCcwIcon className="size-4" />
                    Reload from IndexedDB
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!selectedUsername && !username.trim()}
                    onClick={() => void startSync(selectedUsername || username.trim())}
                  >
                    <DownloadIcon className="size-4" />
                    Restart sync
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!selectedUsername && !username.trim()}
                  onClick={() => void handleClearCache()}
                >
                  <Trash2Icon className="size-4" />
                  Clear this user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </form>
          <SyncBar isLoading={isSyncing || snapshotQuery.isLoading} snapshot={snapshot} />
          {snapshot && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <DatabaseIcon className="size-3 text-primary/60" />
              <span>{snapshot.counts.recentTracks.toLocaleString()} scrobbles</span>
              <span>{snapshot.counts.topArtists.overall.toLocaleString()} ranked artists</span>
              <span>{snapshot.counts.friends.toLocaleString()} friends</span>
            </div>
          )}
        </section>

        {/* Welcome state */}
        {!selectedUsername && (
          <div className="section-in flex flex-col items-center py-24 text-center">
            <h1 className="text-hero text-4xl font-bold tracking-tight sm:text-5xl">
              Your music, visualized
            </h1>
            <p className="mt-3 max-w-md text-pretty text-muted-foreground">
              Enter your Last.fm username to explore your listening history and discover patterns in
              your taste.
            </p>
          </div>
        )}

        {/* Loading state */}
        {selectedUsername && !snapshot && (
          <div className="section-in flex flex-col items-center py-20 text-center">
            <LoaderCircleIcon className="size-6 animate-spin text-primary/40" />
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
          </DashboardProvider>
        )}
      </div>
    </main>
  );
}

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <section className="section-in" style={{ animationDelay: `${delay}ms` } as CSSProperties}>
      {children}
    </section>
  );
}

function Dashboard() {
  return (
    <>
      <div className="divider-fade my-8" />
      <AnimatedSection delay={0}>
        <UserHeader />
      </AnimatedSection>

      <div className="divider-fade my-8" />
      <AnimatedSection delay={60}>
        <ListeningClock />
      </AnimatedSection>

      <div className="divider-fade my-8" />
      <AnimatedSection delay={120}>
        <div className="grid gap-8 sm:grid-cols-2">
          <YearChart />
          <WeekdayChart />
        </div>
      </AnimatedSection>

      <div className="divider-fade my-8" />
      <AnimatedSection delay={180}>
        <AnalyticsSection />
      </AnimatedSection>

      <div className="divider-fade my-8" />
      <AnimatedSection delay={240}>
        <Rankings />
      </AnimatedSection>

      <div className="divider-fade my-8" />
      <AnimatedSection delay={300}>
        <RecentPlays />
      </AnimatedSection>

      <FriendsSection />

      <div className="h-12" />
    </>
  );
}

function FriendsSection() {
  const snapshot = useDashboardSnapshot();

  if (snapshot.friends.length === 0) return null;

  return (
    <>
      <div className="divider-fade my-8" />
      <AnimatedSection delay={360}>
        <FriendsRow />
      </AnimatedSection>
    </>
  );
}
