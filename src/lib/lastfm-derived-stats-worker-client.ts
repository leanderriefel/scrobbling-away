import { deriveLastFmStats, type LastFmDerivedStatsInput } from "@/lib/lastfm-derived-stats";
import type { LastFmDerivedStats } from "@/lib/lastfm-stats-cache";

type WorkerSuccess = {
  ok: true;
  derived: LastFmDerivedStats;
};

type WorkerFailure = {
  ok: false;
  error: string;
};

type WorkerResponse = WorkerSuccess | WorkerFailure;

export const deriveLastFmStatsAsync = async (
  input: LastFmDerivedStatsInput,
): Promise<LastFmDerivedStats> => {
  if (typeof Worker === "undefined") {
    return deriveLastFmStats(input);
  }

  return new Promise<LastFmDerivedStats>((resolve, reject) => {
    const worker = new Worker(new URL("./lastfm-derived-stats.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.addEventListener(
      "message",
      (event: MessageEvent<WorkerResponse>) => {
        worker.terminate();

        if (event.data.ok) {
          resolve(event.data.derived);
          return;
        }

        reject(new Error(event.data.error));
      },
      { once: true },
    );

    worker.addEventListener(
      "error",
      (event) => {
        worker.terminate();
        reject(event.error instanceof Error ? event.error : new Error(event.message));
      },
      { once: true },
    );

    worker.postMessage(input);
  }).catch(() => deriveLastFmStats(input));
};
