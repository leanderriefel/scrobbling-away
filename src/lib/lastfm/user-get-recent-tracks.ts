import { z } from "zod";

import {
  lastFmAlbumSchema,
  lastFmArtistSchema,
  lastFmDateSchema,
  lastFmImageSchema,
  lastFmPaginatedMetaSchema,
  lastFmStreamableSchema,
  type LastFmRequester,
  type LastFmRequestOptions,
  unixSeconds,
} from "@/lib/lastfm/common";

export const getRecentTracksInputSchema = z.object({
  limit: z.number().int().positive().max(200).default(50),
  user: z.string().min(1),
  page: z.number().int().positive().optional(),
  from: z.date().optional(),
  extended: z.boolean().optional(),
  to: z.date().optional(),
});

export const lastFmTrackSchema = z
  .object({
    "@attr": z
      .object({
        nowplaying: z.literal("true").optional(),
      })
      .optional(),
    artist: lastFmArtistSchema,
    name: z.string(),
    mbid: z.string().optional(),
    album: lastFmAlbumSchema.optional(),
    url: z.string(),
    date: lastFmDateSchema.optional(),
    streamable: lastFmStreamableSchema.optional(),
    loved: z.string().optional(),
    image: z.array(lastFmImageSchema).optional(),
  })
  .transform((track) => ({
    ...track,
    streamableValue: track.streamable,
  }))
  .transform((track) => ({
    name: track.name,
    artist: track.artist,
    album: track.album,
    mbid: track.mbid || undefined,
    url: track.url,
    images: track.image ?? [],
    nowPlaying: track["@attr"]?.nowplaying === "true",
    playedAt: track.date,
    streamable: track.streamableValue?.streamable,
    fullTrack: track.streamableValue?.fullTrack,
    loved: track.loved === undefined ? undefined : track.loved === "1",
  }));

export const getRecentTracksResponseSchema = z.object({
  recenttracks: z.object({
    track: z.array(lastFmTrackSchema),
    "@attr": lastFmPaginatedMetaSchema,
  }),
});

export type GetRecentTracksInput = z.input<typeof getRecentTracksInputSchema>;
export type RecentTrack = z.infer<typeof lastFmTrackSchema>;
export type GetRecentTracksResponse = {
  tracks: RecentTrack[];
  meta: {
    user: string;
    page: number;
    perPage: number;
    totalPages: number;
    total: number;
  };
};

type GetRecentTracksOptions = GetRecentTracksInput & LastFmRequestOptions;

export const createGetRecentTracks =
  (requestLastFm: LastFmRequester) =>
  async ({
    apiKey,
    fetcher,
    ...input
  }: GetRecentTracksOptions): Promise<GetRecentTracksResponse> => {
    const params = getRecentTracksInputSchema.parse(input);
    const searchParams = new URLSearchParams({
      method: "user.getrecenttracks",
      user: params.user,
      limit: params.limit.toString(),
    });

    if (params.page !== undefined) {
      searchParams.set("page", params.page.toString());
    }

    if (params.from !== undefined) {
      searchParams.set("from", unixSeconds(params.from));
    }

    if (params.to !== undefined) {
      searchParams.set("to", unixSeconds(params.to));
    }

    if (params.extended !== undefined) {
      searchParams.set("extended", params.extended ? "1" : "0");
    }

    const json = await requestLastFm(searchParams, { apiKey, fetcher });
    const data = getRecentTracksResponseSchema.parse(json);
    const meta = data.recenttracks["@attr"];

    return {
      tracks: data.recenttracks.track,
      meta,
    };
  };
