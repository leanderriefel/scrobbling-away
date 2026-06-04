import { z } from "zod";

import {
  lastFmArtistSchema,
  lastFmImageSchema,
  lastFmPeriodPaginatedMetaSchema,
  lastFmPeriodSchema,
  lastFmStreamableSchema,
  type LastFmRequester,
  type LastFmRequestOptions,
} from "@/lib/lastfm/common";

export const getTopTracksInputSchema = z.object({
  limit: z.number().int().positive().max(200).default(50),
  user: z.string().min(1),
  page: z.number().int().positive().optional(),
  period: lastFmPeriodSchema.optional(),
});

const topTracksMetaSchema = lastFmPeriodPaginatedMetaSchema;

const lastFmTopTrackSchema = z
  .object({
    "@attr": z
      .object({
        rank: z.string(),
      })
      .optional(),
    name: z.string(),
    playcount: z.string(),
    mbid: z.string().optional(),
    url: z.string(),
    streamable: lastFmStreamableSchema.optional(),
    artist: lastFmArtistSchema,
    image: z.array(lastFmImageSchema).optional(),
  })
  .transform((track) => ({
    rank: track["@attr"]?.rank === undefined ? undefined : Number(track["@attr"].rank),
    name: track.name,
    playcount: Number(track.playcount),
    mbid: track.mbid || undefined,
    url: track.url,
    streamable: track.streamable?.streamable,
    fullTrack: track.streamable?.fullTrack,
    artist: track.artist,
    images: track.image ?? [],
  }));

export const getTopTracksResponseSchema = z.object({
  toptracks: z.object({
    track: z.array(lastFmTopTrackSchema),
    "@attr": topTracksMetaSchema,
  }),
});

export type GetTopTracksInput = z.input<typeof getTopTracksInputSchema>;
export type TopTrack = z.infer<typeof lastFmTopTrackSchema>;
export type GetTopTracksResponse = {
  tracks: TopTrack[];
  meta: z.infer<typeof topTracksMetaSchema>;
};

type GetTopTracksOptions = GetTopTracksInput & LastFmRequestOptions;

export const createGetTopTracks =
  (requestLastFm: LastFmRequester) =>
  async ({ apiKey, fetcher, ...input }: GetTopTracksOptions): Promise<GetTopTracksResponse> => {
    const params = getTopTracksInputSchema.parse(input);
    const searchParams = new URLSearchParams({
      method: "user.gettoptracks",
      user: params.user,
      limit: params.limit.toString(),
    });

    if (params.page !== undefined) {
      searchParams.set("page", params.page.toString());
    }

    if (params.period !== undefined) {
      searchParams.set("period", params.period);
    }

    const json = await requestLastFm(searchParams, { apiKey, fetcher });
    const data = getTopTracksResponseSchema.parse(json);

    return {
      tracks: data.toptracks.track,
      meta: data.toptracks["@attr"],
    };
  };
