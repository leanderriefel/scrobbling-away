import { z } from "zod";

import {
  lastFmImageSchema,
  lastFmListSchema,
  lastFmPeriodPaginatedMetaSchema,
  lastFmPeriodSchema,
  lastFmStreamableSchema,
  type LastFmRequester,
  type LastFmRequestOptions,
} from "@/lib/lastfm/common";

export const getTopArtistsInputSchema = z.object({
  limit: z.number().int().positive().max(200).default(50),
  user: z.string().min(1),
  page: z.number().int().positive().optional(),
  period: lastFmPeriodSchema.optional(),
});

const topArtistsMetaSchema = lastFmPeriodPaginatedMetaSchema;

const lastFmTopArtistSchema = z
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
    image: z.array(lastFmImageSchema).optional(),
  })
  .transform((artist) => ({
    rank: artist["@attr"]?.rank === undefined ? undefined : Number(artist["@attr"].rank),
    name: artist.name,
    playcount: Number(artist.playcount),
    mbid: artist.mbid || undefined,
    url: artist.url,
    streamable: artist.streamable?.streamable,
    fullTrack: artist.streamable?.fullTrack,
    images: [] as Array<{ "#text": string; size: string }>,
  }));

export const getTopArtistsResponseSchema = z.object({
  topartists: z.object({
    artist: lastFmListSchema(lastFmTopArtistSchema),
    "@attr": topArtistsMetaSchema,
  }),
});

export type GetTopArtistsInput = z.input<typeof getTopArtistsInputSchema>;
export type TopArtist = z.infer<typeof lastFmTopArtistSchema>;
export type GetTopArtistsResponse = {
  artists: TopArtist[];
  meta: z.infer<typeof topArtistsMetaSchema>;
};

type GetTopArtistsOptions = GetTopArtistsInput & LastFmRequestOptions;

export const createGetTopArtists =
  (requestLastFm: LastFmRequester) =>
  async ({ apiKey, fetcher, ...input }: GetTopArtistsOptions): Promise<GetTopArtistsResponse> => {
    const params = getTopArtistsInputSchema.parse(input);
    const searchParams = new URLSearchParams({
      method: "user.gettopartists",
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
    const data = getTopArtistsResponseSchema.parse(json);

    return {
      artists: data.topartists.artist,
      meta: data.topartists["@attr"],
    };
  };
