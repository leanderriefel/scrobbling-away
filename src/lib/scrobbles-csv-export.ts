import streamSaver from "streamsaver";

import { lastFmStatsDb, type CachedRecentTrack } from "@/lib/lastfm-stats-cache";

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
};

declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}

export const SCROBBLE_CSV_COLUMNS = [
  "artist",
  "track",
  "album",
  "played_at_unix",
  "played_at_utc",
  "loved",
  "track_url",
  "artist_mbid",
  "track_mbid",
] as const;

export const SCROBBLE_CSV_HEADER = `${SCROBBLE_CSV_COLUMNS.join(",")}\n`;

const DEFAULT_CHUNK_ROW_LIMIT = 5_000;
const DEFAULT_CHUNK_BYTE_LIMIT = 4 * 1024 * 1024;
const textEncoder = new TextEncoder();

type FileSystemWritable = {
  write: (chunk: BufferSource) => Promise<void>;
  close: () => Promise<void>;
  abort: () => Promise<void>;
};

type FileSystemFileHandle = {
  createWritable: () => Promise<FileSystemWritable>;
};

export type ScrobbleCsvExportCode =
  | "cancelled"
  | "permission_denied"
  | "write_failed"
  | "read_failed"
  | "unsupported";

export class ScrobbleCsvExportError extends Error {
  readonly code: ScrobbleCsvExportCode;

  constructor(message: string, code: ScrobbleCsvExportCode) {
    super(message);
    this.name = "ScrobbleCsvExportError";
    this.code = code;
  }
}

export type ScrobbleCsvExportProgress = {
  rowsWritten: number;
  bytesWritten: number;
};

export type ScrobbleCsvExportOptions = {
  usernameLower: string;
  username: string;
  signal?: AbortSignal;
  onProgress?: (progress: ScrobbleCsvExportProgress) => void;
  chunkRowLimit?: number;
  chunkByteLimit?: number;
};

type CsvFileWriter = {
  bytesWritten: number;
  write: (data: Uint8Array) => Promise<void>;
  close: () => Promise<void>;
  abort: () => Promise<void>;
};

type ScrobbleChunkRead = {
  rows: CachedRecentTrack[];
  lastId: string | undefined;
  done: boolean;
};

const sanitizeFilename = (filename: string) => {
  const withoutReserved = filename.replace(/[<>:"/\\|?*]/g, "_");
  const withoutControlChars = [...withoutReserved]
    .map((char) => (char.charCodeAt(0) < 32 ? "_" : char))
    .join("");

  return withoutControlChars.trim() || "scrobbles.csv";
};

export const escapeCsvField = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (text.includes(",") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
};

export const encodeScrobbleCsvRow = (row: CachedRecentTrack): string => {
  const playedAtUtc = new Date(row.playedAtTimestamp * 1000).toISOString();
  const fields = [
    row.artistName,
    row.trackName,
    row.albumName ?? "",
    row.playedAtTimestamp,
    playedAtUtc,
    row.loved ? "true" : "false",
    row.track.url,
    row.track.artist.mbid ?? "",
    row.track.mbid ?? "",
  ];

  return `${fields.map(escapeCsvField).join(",")}\n`;
};

export const encodeScrobbleCsvChunk = (rows: CachedRecentTrack[]): string =>
  rows.map(encodeScrobbleCsvRow).join("");

const estimateRowBytes = (row: CachedRecentTrack) =>
  textEncoder.encode(encodeScrobbleCsvRow(row)).byteLength;

const readScrobbleChunk = async (
  usernameLower: string,
  lastId: string | undefined,
  exportStartedAtIso: string,
  maxRows: number,
  maxBytes: number,
): Promise<ScrobbleChunkRead> => {
  const rows: CachedRecentTrack[] = [];
  let chunkBytes = 0;
  let exhausted = true;
  let chunkLastId = lastId;

  const idLower = lastId ?? `${usernameLower}:`;
  const idUpper = `${usernameLower}:\uffff`;

  try {
    await lastFmStatsDb.transaction("r", lastFmStatsDb.recentTracks, async () => {
      await lastFmStatsDb.recentTracks
        .where("id")
        .between(idLower, idUpper, Boolean(lastId), false)
        .each((row) => {
          if (row.usernameLower !== usernameLower) {
            return;
          }

          if (row.fetchedAt > exportStartedAtIso) {
            return;
          }

          const rowBytes = estimateRowBytes(row);

          if (rows.length > 0 && (rows.length >= maxRows || chunkBytes + rowBytes > maxBytes)) {
            exhausted = false;
            return false;
          }

          rows.push(row);
          chunkBytes += rowBytes;
          chunkLastId = row.id;
        });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read scrobbles from IndexedDB.";
    throw new ScrobbleCsvExportError(message, "read_failed");
  }

  return {
    rows,
    lastId: chunkLastId,
    done: exhausted && rows.length === 0,
  };
};

const configureStreamSaver = () => {
  streamSaver.mitm = `${window.location.origin}/streamsaver/mitm.html`;
};

const createStreamSaverWriter = (filename: string): CsvFileWriter => {
  configureStreamSaver();

  const fileStream = streamSaver.createWriteStream(filename);
  const writer = fileStream.getWriter();
  let bytesWritten = 0;
  let closed = false;

  return {
    get bytesWritten() {
      return bytesWritten;
    },
    write: async (data) => {
      await writer.write(data);
      bytesWritten += data.byteLength;
    },
    close: async () => {
      if (closed) return;

      closed = true;
      await writer.close();
    },
    abort: async () => {
      if (closed) return;

      closed = true;

      try {
        await writer.abort();
      } catch {
        // Stream may already be closed after cancellation.
      }
    },
  };
};

const createFileSystemAccessWriter = async (filename: string): Promise<CsvFileWriter> => {
  if (typeof window.showSaveFilePicker !== "function") {
    throw new ScrobbleCsvExportError(
      "This browser does not support choosing a save location.",
      "unsupported",
    );
  }

  let handle: FileSystemFileHandle;

  try {
    handle = (await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
    })) as FileSystemFileHandle;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ScrobbleCsvExportError("Export cancelled.", "cancelled");
    }

    if (error instanceof DOMException && error.name === "NotAllowedError") {
      throw new ScrobbleCsvExportError(
        "Permission to save the file was denied.",
        "permission_denied",
      );
    }

    throw error;
  }

  let writable: FileSystemWritable;

  try {
    writable = await handle.createWritable();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open the export file.";
    throw new ScrobbleCsvExportError(message, "write_failed");
  }

  let bytesWritten = 0;
  let closed = false;

  return {
    get bytesWritten() {
      return bytesWritten;
    },
    write: async (data) => {
      try {
        await writable.write(data as BufferSource);
        bytesWritten += data.byteLength;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not write to the export file.";
        throw new ScrobbleCsvExportError(message, "write_failed");
      }
    },
    close: async () => {
      if (closed) return;

      closed = true;
      await writable.close();
    },
    abort: async () => {
      if (closed) return;

      closed = true;

      try {
        await writable.abort();
      } catch {
        // Ignore abort errors on partially written files.
      }
    },
  };
};

const createCsvFileWriter = async (filename: string): Promise<CsvFileWriter> => {
  if (typeof window.showSaveFilePicker === "function") {
    try {
      return await createFileSystemAccessWriter(filename);
    } catch (error) {
      if (
        error instanceof ScrobbleCsvExportError &&
        (error.code === "cancelled" || error.code === "permission_denied")
      ) {
        throw error;
      }
    }
  }

  return createStreamSaverWriter(filename);
};

const throwIfCancelled = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) {
    throw new ScrobbleCsvExportError("Export cancelled.", "cancelled");
  }
};

export const exportScrobblesToCsv = async ({
  usernameLower,
  username,
  signal,
  onProgress,
  chunkRowLimit = DEFAULT_CHUNK_ROW_LIMIT,
  chunkByteLimit = DEFAULT_CHUNK_BYTE_LIMIT,
}: ScrobbleCsvExportOptions): Promise<ScrobbleCsvExportProgress> => {
  const exportStartedAtIso = new Date().toISOString();
  const filename = sanitizeFilename(`${username}-scrobbles.csv`);
  let writer: CsvFileWriter | undefined;
  let rowsWritten = 0;

  try {
    throwIfCancelled(signal);
    writer = await createCsvFileWriter(filename);
    throwIfCancelled(signal);

    await writer.write(textEncoder.encode(`\uFEFF${SCROBBLE_CSV_HEADER}`));

    let lastId: string | undefined;
    let done = false;

    while (!done) {
      throwIfCancelled(signal);

      const chunk = await readScrobbleChunk(
        usernameLower,
        lastId,
        exportStartedAtIso,
        chunkRowLimit,
        chunkByteLimit,
      );

      if (chunk.rows.length === 0) {
        done = true;
        break;
      }

      const csvText = encodeScrobbleCsvChunk(chunk.rows);
      await writer.write(textEncoder.encode(csvText));

      rowsWritten += chunk.rows.length;
      lastId = chunk.lastId;
      done = chunk.done;

      onProgress?.({
        rowsWritten,
        bytesWritten: writer.bytesWritten,
      });

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0);
      });
    }

    await writer.close();
    const bytesWritten = writer.bytesWritten;
    writer = undefined;

    const progress = {
      rowsWritten,
      bytesWritten,
    };

    onProgress?.(progress);

    return progress;
  } catch (error) {
    if (writer) {
      await writer.abort().catch(() => undefined);
    }

    if (error instanceof ScrobbleCsvExportError) {
      throw error;
    }

    if (signal?.aborted) {
      throw new ScrobbleCsvExportError("Export cancelled.", "cancelled");
    }

    const message = error instanceof Error ? error.message : "Export failed.";
    throw new ScrobbleCsvExportError(message, "write_failed");
  }
};
