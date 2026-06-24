import { useLiveQuery } from "@tanstack/react-db";
import {
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PlusIcon,
  ScanSearchIcon,
  SquareIcon,
  UsersIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
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

import { CompareDashboard } from "./compare-dashboard";
import { SyncBar } from "./sync-bar";

const COMPARE_USERNAMES_KEY = "scrobbling-away:compare-usernames:v1";
const MAX_COMPARE_USERS = 4;
const MIN_COMPARE_USERS = 2;

const hasCachedSnapshotData = (snapshot: LastFmStatsSnapshot | undefined) =>
  Boolean(snapshot?.profile) ||
  (snapshot?.counts.recentTracks ?? 0) > 0 ||
  (snapshot?.counts.friends ?? 0) > 0 ||
  (snapshot?.counts.topArtists.overall ?? 0) > 0;

const loadCompareUsernames = (): string[] => {
  try {
    const raw = window.localStorage.getItem(COMPARE_USERNAMES_KEY);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  } catch {
    return [];
  }
};

const saveCompareUsernames = (usernames: string[]) => {
  try {
    if (usernames.length === 0) {
      window.localStorage.removeItem(COMPARE_USERNAMES_KEY);
      return;
    }

    window.localStorage.setItem(COMPARE_USERNAMES_KEY, JSON.stringify(usernames));
  } catch {
    toast.error("Could not save compare users in this browser.");
  }
};

export const CompareWorkspace = () => {
  const [compareUsernames, setCompareUsernames] = useState<string[]>([]);
  const [compareInput, setCompareInput] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<LastFmPeriod>("overall");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hydratedUserIdsRef = useRef(new Set<string>());
  const hydratingUserIdsRef = useRef(new Set<string>());
  const [hydratingUserIds, setHydratingUserIds] = useState<Set<string>>(() => new Set());

  const allSnapshotsQuery = useLiveQuery(
    (query) => query.from({ snapshot: statsSnapshotsCollection }),
    [],
  );

  const allSnapshots = useMemo<LastFmStatsSnapshot[]>(
    () =>
      Array.isArray(allSnapshotsQuery.data)
        ? allSnapshotsQuery.data.map((row) => row as LastFmStatsSnapshot)
        : [],
    [allSnapshotsQuery.data],
  );
  const snapshotById = useMemo(
    () => new Map(allSnapshots.map((snapshot) => [snapshot.id, snapshot])),
    [allSnapshots],
  );
  const orderedSnapshots = useMemo(() => {
    return compareUsernames
      .map((username) => {
        const id = normalizeUsername(username);
        const snapshot = snapshotById.get(id);

        return hasCachedSnapshotData(snapshot) ? snapshot : undefined;
      })
      .filter((row): row is LastFmStatsSnapshot => row !== undefined);
  }, [compareUsernames, snapshotById]);

  const pendingUsernames = compareUsernames.filter(
    (username) => !hasCachedSnapshotData(snapshotById.get(normalizeUsername(username))),
  );
  const hydratingUsernames = pendingUsernames.filter((username) =>
    hydratingUserIds.has(normalizeUsername(username)),
  );

  useEffect(() => {
    void statsSnapshotsCollection.preload();
    const saved = loadCompareUsernames();

    if (saved.length === 0) return;

    setCompareUsernames(saved);
  }, []);

  useEffect(() => {
    const usernamesToHydrate = compareUsernames.filter((username) => {
      const id = normalizeUsername(username);

      return (
        !hasCachedSnapshotData(snapshotById.get(id)) &&
        !hydratedUserIdsRef.current.has(id) &&
        !hydratingUserIdsRef.current.has(id)
      );
    });

    if (usernamesToHydrate.length === 0) return;

    for (const username of usernamesToHydrate) {
      const id = normalizeUsername(username);

      hydratingUserIdsRef.current.add(id);
      setHydratingUserIds((current) => new Set(current).add(id));

      void (async () => {
        try {
          await markAbandonedSyncStopped(username);
          await hydrateStatsSnapshotFromCache(username);
          hydratedUserIdsRef.current.add(id);
        } catch {
          toast.error(`Could not load stats for @${username}.`);
        } finally {
          hydratingUserIdsRef.current.delete(id);
          setHydratingUserIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }
      })();
    }
  }, [compareUsernames, snapshotById]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const persistCompareUsernames = (next: string[]) => {
    setCompareUsernames(next);
    saveCompareUsernames(next);
  };

  const addCompareUser = (raw: string) => {
    const trimmed = raw.trim();

    if (!trimmed) {
      toast.error("Enter a Last.fm username.");
      return;
    }

    const id = normalizeUsername(trimmed);

    if (compareUsernames.some((name) => normalizeUsername(name) === id)) {
      toast.error("That user is already in the compare list.");
      return;
    }

    if (compareUsernames.length >= MAX_COMPARE_USERS) {
      toast.error(`You can compare up to ${MAX_COMPARE_USERS} users at once.`);
      return;
    }

    const next = [...compareUsernames, trimmed];
    persistCompareUsernames(next);
    setCompareInput("");
  };

  const removeCompareUser = (username: string) => {
    const id = normalizeUsername(username);
    hydratedUserIdsRef.current.delete(id);
    hydratingUserIdsRef.current.delete(id);
    setHydratingUserIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    persistCompareUsernames(compareUsernames.filter((name) => normalizeUsername(name) !== id));
  };

  const handleAddSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addCompareUser(compareInput);
  };

  const syncAll = async (mode: LastFmSyncMode = "quick") => {
    if (compareUsernames.length < MIN_COMPARE_USERS) {
      toast.error(`Add at least ${MIN_COMPARE_USERS} users to compare.`);
      return;
    }

    setIsSyncingAll(true);
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for (const username of compareUsernames) {
        if (controller.signal.aborted) break;

        await hydrateStatsSnapshotFromCache(username);
        const snapshot = statsSnapshotsCollection.get(normalizeUsername(username));
        const userMode: LastFmSyncMode =
          mode === "deep" ? "deep" : hasCachedSnapshotData(snapshot) ? "quick" : "deep";
        await syncLastFmStats(username, {
          mode: userMode,
          includeRecentTracks: true,
          signal: controller.signal,
        });
      }

      if (!controller.signal.aborted) {
        toast.success(mode === "quick" ? "New scrobbles synced." : "Full sync complete.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";

      toast.error(message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;

      setIsSyncingAll(false);
    }
  };

  const canCompare =
    compareUsernames.length >= MIN_COMPARE_USERS &&
    pendingUsernames.length === 0 &&
    orderedSnapshots.length >= MIN_COMPARE_USERS;

  return (
    <div className="grid gap-6">
      <section className="animate-section-in motion-reduce:animate-none grid gap-3">
        <form className="flex gap-2" onSubmit={handleAddSubmit}>
          <Input
            className="flex-1"
            placeholder="Add username"
            autoComplete="username"
            value={compareInput}
            onChange={(event) => setCompareInput(event.target.value)}
          />
          <Button type="submit" variant="outline">
            <PlusIcon className="size-4" />
            Add
          </Button>
          {isSyncingAll ? (
            <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}>
              <SquareIcon className="size-4" />
              Stop
            </Button>
          ) : (
            <>
              <Button
                type="button"
                disabled={compareUsernames.length < MIN_COMPARE_USERS}
                onClick={() => void syncAll("quick")}
              >
                <ZapIcon className="size-4" />
                Quick sync all
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={compareUsernames.length < MIN_COMPARE_USERS}
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => void syncAll("deep")}>
                    <ScanSearchIcon className="size-4" />
                    Deep sync all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </form>

        {compareUsernames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {compareUsernames.map((username) => {
              const id = normalizeUsername(username);
              const snapshot = orderedSnapshots.find((row) => row.id === id);
              const isPending = !snapshot;

              return (
                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                  <span className="max-w-[140px] truncate">{username}</span>
                  {isPending && (
                    <LoaderCircleIcon className="size-3 animate-spin text-muted-foreground" />
                  )}
                  <button
                    type="button"
                    className="rounded-md p-0.5 hover:bg-muted"
                    aria-label={`Remove ${username}`}
                    onClick={() => removeCompareUser(username)}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        {compareUsernames.length > 0 && compareUsernames.length < MIN_COMPARE_USERS && (
          <p className="text-xs text-muted-foreground">
            Add {MIN_COMPARE_USERS - compareUsernames.length} more user
            {compareUsernames.length === MIN_COMPARE_USERS - 1 ? "" : "s"} to start comparing.
          </p>
        )}

        {pendingUsernames.length > 0 && (
          <div className="grid gap-2 rounded-lg bg-accent/30 px-3 py-2.5 text-[12px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <LoaderCircleIcon
                className={
                  isSyncingAll || allSnapshotsQuery.isLoading
                    ? "size-3 animate-spin"
                    : "size-3 opacity-50"
                }
              />
              <span>
                {hydratingUsernames.length > 0 ? "Loading stats for " : "No stats yet for "}
                {pendingUsernames.map((name) => `@${name}`).join(", ")}
                {hydratingUsernames.length > 0 ? "…" : ". Use Quick sync all to fetch."}
              </span>
            </div>
          </div>
        )}

        {orderedSnapshots.length > 0 && (
          <div className="grid gap-2">
            {orderedSnapshots.map((snapshot) => (
              <SyncBar
                key={snapshot.id}
                isLoading={isSyncingAll && compareUsernames.includes(snapshot.username)}
                snapshot={snapshot}
              />
            ))}
          </div>
        )}
      </section>

      {compareUsernames.length >= MIN_COMPARE_USERS &&
        pendingUsernames.length > 0 &&
        !isSyncingAll && (
          <div className="animate-section-in motion-reduce:animate-none flex flex-col items-center py-16 text-center">
            <UsersIcon className="size-6 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Waiting for stats. Run Sync all or sync each user from Your stats first.
            </p>
          </div>
        )}

      {canCompare && (
        <CompareDashboard
          snapshots={orderedSnapshots}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
        />
      )}
    </div>
  );
};
