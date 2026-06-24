import { z } from "zod";

export type LastFmRequestOptions = {
  apiKey?: string;
  fetcher?: typeof fetch;
};

export type LastFmRequester = (
  searchParams: URLSearchParams,
  options?: LastFmRequestOptions,
) => Promise<unknown>;

export const lastFmPeriodSchema = z.enum([
  "overall",
  "7day",
  "1month",
  "3month",
  "6month",
  "12month",
]);

export const lastFmImageSchema = z.object({
  "#text": z.string(),
  size: z.string(),
});

export const lastFmTextValueSchema = z
  .object({
    "#text": z.string(),
    mbid: z.string().optional(),
  })
  .passthrough();

export const lastFmArtistSchema = z
  .union([
    lastFmTextValueSchema,
    z
      .object({
        name: z.string(),
        mbid: z.string().optional(),
        url: z.string().optional(),
      })
      .passthrough(),
  ])
  .transform((artist) => ({
    name: "#text" in artist ? artist["#text"] : artist.name,
    mbid: artist.mbid || undefined,
    url: "url" in artist ? artist.url : undefined,
  }));

export const lastFmAlbumSchema = lastFmTextValueSchema.transform((album) => ({
  name: album["#text"],
  mbid: album.mbid || undefined,
}));

export const lastFmDateSchema = z
  .object({
    "#text": z.string(),
    uts: z.string(),
  })
  .transform((date) => ({
    label: date["#text"],
    timestamp: Number(date.uts),
  }));

export const lastFmRegisteredDateSchema = z
  .object({
    "#text": z.union([z.string(), z.number()]).optional(),
    unixtime: z.union([z.string(), z.number()]),
  })
  .transform((date) => ({
    label: date["#text"]?.toString(),
    timestamp: Number(date.unixtime),
  }));

export const lastFmStreamableSchema = z
  .union([
    z.string(),
    z
      .object({
        "#text": z.string(),
        fulltrack: z.string().optional(),
      })
      .passthrough(),
  ])
  .transform((streamable) => {
    if (typeof streamable === "string") {
      return {
        streamable: streamable === "1",
        fullTrack: undefined,
      };
    }

    return {
      streamable: streamable["#text"] === "1",
      fullTrack: streamable.fulltrack === undefined ? undefined : streamable.fulltrack === "1",
    };
  });

export const lastFmPaginatedMetaSchema = z
  .object({
    user: z.string(),
    page: z.string(),
    perPage: z.string(),
    totalPages: z.string(),
    total: z.string(),
  })
  .passthrough()
  .transform((meta) => ({
    user: meta.user,
    page: numberFromLastFm(meta.page),
    perPage: numberFromLastFm(meta.perPage),
    totalPages: numberFromLastFm(meta.totalPages),
    total: numberFromLastFm(meta.total),
  }));

export const lastFmPeriodPaginatedMetaSchema = z
  .object({
    user: z.string(),
    page: z.string(),
    perPage: z.string(),
    totalPages: z.string(),
    total: z.string(),
    type: lastFmPeriodSchema.optional(),
  })
  .passthrough()
  .transform((meta) => ({
    user: meta.user,
    page: numberFromLastFm(meta.page),
    perPage: numberFromLastFm(meta.perPage),
    totalPages: numberFromLastFm(meta.totalPages),
    total: numberFromLastFm(meta.total),
    type: meta.type,
  }));

export const lastFmRawUserSchema = z
  .object({
    name: z.string(),
    realname: z.string().optional(),
    url: z.string(),
    image: z.array(lastFmImageSchema).optional(),
    country: z.string().optional(),
    age: z.union([z.string(), z.number()]).optional(),
    gender: z.string().optional(),
    subscriber: z.union([z.string(), z.number()]).optional(),
    playcount: z.union([z.string(), z.number()]).optional(),
    playlists: z.union([z.string(), z.number()]).optional(),
    bootstrap: z.union([z.string(), z.number()]).optional(),
    registered: lastFmRegisteredDateSchema.optional(),
    type: z.string().optional(),
  })
  .passthrough();

export const normalizeLastFmUser = (user: z.infer<typeof lastFmRawUserSchema>) => ({
  name: user.name,
  realname: user.realname || undefined,
  url: user.url,
  images: user.image ?? [],
  country: user.country || undefined,
  age: user.age === undefined ? undefined : Number(user.age),
  gender: user.gender || undefined,
  subscriber: user.subscriber === undefined ? undefined : Number(user.subscriber) === 1,
  playcount: user.playcount === undefined ? undefined : Number(user.playcount),
  playlists: user.playlists === undefined ? undefined : Number(user.playlists),
  bootstrap: user.bootstrap === undefined ? undefined : Number(user.bootstrap) === 1,
  registered: user.registered,
  type: user.type || undefined,
});

export const lastFmUserSchema = lastFmRawUserSchema.transform(normalizeLastFmUser);

export const unixSeconds = (date: Date) => Math.floor(date.getTime() / 1000).toString();

export const numberFromLastFm = (value: string) => Number(value);

/** Last.fm returns a single object instead of a one-item array for list fields. */
export const lastFmListSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return [];
    return Array.isArray(value) ? value : [value];
  }, z.array(item));
