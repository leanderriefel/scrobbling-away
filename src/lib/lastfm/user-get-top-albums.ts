import { z } from "zod";

import {
  lastFmArtistSchema,
  lastFmImageSchema,
  lastFmListSchema,
  lastFmPeriodPaginatedMetaSchema,
  lastFmPeriodSchema,
  type LastFmRequester,
  type LastFmRequestOptions,
} from "@/lib/lastfm/common";

export const getTopAlbumsInputSchema = z.object({
  limit: z.number().int().positive().max(200).default(50),
  user: z.string().min(1),
  page: z.number().int().positive().optional(),
  period: lastFmPeriodSchema.optional(),
});

const topAlbumsMetaSchema = lastFmPeriodPaginatedMetaSchema;

const lastFmTopAlbumSchema = z
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
    artist: lastFmArtistSchema,
    image: z.array(lastFmImageSchema).optional(),
  })
  .transform((album) => ({
    rank: album["@attr"]?.rank === undefined ? undefined : Number(album["@attr"].rank),
    name: album.name,
    playcount: Number(album.playcount),
    mbid: album.mbid || undefined,
    url: album.url,
    artist: album.artist,
    images: album.image ?? [],
  }));

export const getTopAlbumsResponseSchema = z.object({
  topalbums: z.object({
    album: lastFmListSchema(lastFmTopAlbumSchema),
    "@attr": topAlbumsMetaSchema,
  }),
});

export type GetTopAlbumsInput = z.input<typeof getTopAlbumsInputSchema>;
export type TopAlbum = z.infer<typeof lastFmTopAlbumSchema>;
export type GetTopAlbumsResponse = {
  albums: TopAlbum[];
  meta: z.infer<typeof topAlbumsMetaSchema>;
};

type GetTopAlbumsOptions = GetTopAlbumsInput & LastFmRequestOptions;

export const createGetTopAlbums =
  (requestLastFm: LastFmRequester) =>
  async ({ apiKey, fetcher, ...input }: GetTopAlbumsOptions): Promise<GetTopAlbumsResponse> => {
    const params = getTopAlbumsInputSchema.parse(input);
    const searchParams = new URLSearchParams({
      method: "user.gettopalbums",
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
    const data = getTopAlbumsResponseSchema.parse(json);

    return {
      albums: data.topalbums.album,
      meta: data.topalbums["@attr"],
    };
  };
