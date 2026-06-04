import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { env } from "@/env/web";
import {
  createGetFriends,
  getFriendsInputSchema,
  getFriendsResponseSchema,
  type Friend,
  type GetFriendsInput,
  type GetFriendsResponse,
} from "@/lib/lastfm/user-get-friends";
import {
  createGetInfo,
  getInfoInputSchema,
  getInfoResponseSchema,
  type GetInfoInput,
  type GetInfoResponse,
  type UserInfo,
} from "@/lib/lastfm/user-get-info";
import {
  createGetRecentTracks,
  getRecentTracksInputSchema,
  getRecentTracksResponseSchema,
  type GetRecentTracksInput,
  type GetRecentTracksResponse,
  type RecentTrack,
} from "@/lib/lastfm/user-get-recent-tracks";
import {
  createGetTopAlbums,
  getTopAlbumsInputSchema,
  getTopAlbumsResponseSchema,
  type GetTopAlbumsInput,
  type GetTopAlbumsResponse,
  type TopAlbum,
} from "@/lib/lastfm/user-get-top-albums";
import {
  createGetTopArtists,
  getTopArtistsInputSchema,
  getTopArtistsResponseSchema,
  type GetTopArtistsInput,
  type GetTopArtistsResponse,
  type TopArtist,
} from "@/lib/lastfm/user-get-top-artists";
import {
  createGetTopTracks,
  getTopTracksInputSchema,
  getTopTracksResponseSchema,
  type GetTopTracksInput,
  type GetTopTracksResponse,
  type TopTrack,
} from "@/lib/lastfm/user-get-top-tracks";

const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";

export type LastFmRequestOptions = {
  apiKey?: string;
  fetcher?: typeof fetch;
};

const lastFmErrorSchema = z.object({
  error: z.number(),
  message: z.string(),
});

export const requestLastFm = async (
  searchParams: URLSearchParams,
  { apiKey = env.VITE_LASTFM_KEY, fetcher = fetch }: LastFmRequestOptions = {},
): Promise<unknown> => {
  searchParams.set("api_key", apiKey);
  searchParams.set("format", "json");

  const response = await fetcher(`${LASTFM_API_URL}?${searchParams.toString()}`);
  const json: unknown = await response.json();
  const lastFmError = lastFmErrorSchema.safeParse(json);

  if (!response.ok || lastFmError.success) {
    const message = lastFmError.success
      ? lastFmError.data.message
      : `Last.fm request failed with status ${response.status}`;

    throw new Error(message);
  }

  return json;
};

export const getFriends = createGetFriends(requestLastFm);
export const getInfo = createGetInfo(requestLastFm);
export const getRecentTracks = createGetRecentTracks(requestLastFm);
export const getTopAlbums = createGetTopAlbums(requestLastFm);
export const getTopArtists = createGetTopArtists(requestLastFm);
export const getTopTracks = createGetTopTracks(requestLastFm);

const lastFmQueryKeyPrefix = ["lastfm"] as const;

const omitRequestOptions = <TInput extends object>(
  input: TInput & LastFmRequestOptions,
): TInput => {
  const { apiKey: _apiKey, fetcher: _fetcher, ...queryInput } = input;

  return queryInput as TInput;
};

const serializeRecentTracksInput = (input: GetRecentTracksInput) => ({
  ...input,
  from: input.from?.toISOString(),
  to: input.to?.toISOString(),
});

export const getFriendsQueryKey = (input: GetFriendsInput & LastFmRequestOptions) =>
  [
    ...lastFmQueryKeyPrefix,
    "user.getFriends",
    getFriendsInputSchema.parse(omitRequestOptions<GetFriendsInput>(input)),
  ] as const;

export const getInfoQueryKey = (input: GetInfoInput & LastFmRequestOptions = {}) =>
  [
    ...lastFmQueryKeyPrefix,
    "user.getInfo",
    getInfoInputSchema.parse(omitRequestOptions<GetInfoInput>(input)),
  ] as const;

export const getRecentTracksQueryKey = (input: GetRecentTracksInput & LastFmRequestOptions) =>
  [
    ...lastFmQueryKeyPrefix,
    "user.getRecentTracks",
    serializeRecentTracksInput(
      getRecentTracksInputSchema.parse(omitRequestOptions<GetRecentTracksInput>(input)),
    ),
  ] as const;

export const getTopAlbumsQueryKey = (input: GetTopAlbumsInput & LastFmRequestOptions) =>
  [
    ...lastFmQueryKeyPrefix,
    "user.getTopAlbums",
    getTopAlbumsInputSchema.parse(omitRequestOptions<GetTopAlbumsInput>(input)),
  ] as const;

export const getTopArtistsQueryKey = (input: GetTopArtistsInput & LastFmRequestOptions) =>
  [
    ...lastFmQueryKeyPrefix,
    "user.getTopArtists",
    getTopArtistsInputSchema.parse(omitRequestOptions<GetTopArtistsInput>(input)),
  ] as const;

export const getTopTracksQueryKey = (input: GetTopTracksInput & LastFmRequestOptions) =>
  [
    ...lastFmQueryKeyPrefix,
    "user.getTopTracks",
    getTopTracksInputSchema.parse(omitRequestOptions<GetTopTracksInput>(input)),
  ] as const;

export const getFriendsQueryOptions = (input: Parameters<typeof getFriends>[0]) =>
  queryOptions({
    queryKey: getFriendsQueryKey(input),
    queryFn: () => getFriends(input),
  });

export const getInfoQueryOptions = (input: Parameters<typeof getInfo>[0] = {}) =>
  queryOptions({
    queryKey: getInfoQueryKey(input),
    queryFn: () => getInfo(input),
  });

export const getRecentTracksQueryOptions = (input: Parameters<typeof getRecentTracks>[0]) =>
  queryOptions({
    queryKey: getRecentTracksQueryKey(input),
    queryFn: () => getRecentTracks(input),
  });

export const getTopAlbumsQueryOptions = (input: Parameters<typeof getTopAlbums>[0]) =>
  queryOptions({
    queryKey: getTopAlbumsQueryKey(input),
    queryFn: () => getTopAlbums(input),
  });

export const getTopArtistsQueryOptions = (input: Parameters<typeof getTopArtists>[0]) =>
  queryOptions({
    queryKey: getTopArtistsQueryKey(input),
    queryFn: () => getTopArtists(input),
  });

export const getTopTracksQueryOptions = (input: Parameters<typeof getTopTracks>[0]) =>
  queryOptions({
    queryKey: getTopTracksQueryKey(input),
    queryFn: () => getTopTracks(input),
  });

export {
  getFriendsInputSchema,
  getFriendsResponseSchema,
  getInfoInputSchema,
  getInfoResponseSchema,
  getRecentTracksInputSchema,
  getRecentTracksResponseSchema,
  getTopAlbumsInputSchema,
  getTopAlbumsResponseSchema,
  getTopArtistsInputSchema,
  getTopArtistsResponseSchema,
  getTopTracksInputSchema,
  getTopTracksResponseSchema,
  type Friend,
  type GetFriendsInput,
  type GetFriendsResponse,
  type GetInfoInput,
  type GetInfoResponse,
  type GetRecentTracksInput,
  type GetRecentTracksResponse,
  type GetTopAlbumsInput,
  type GetTopAlbumsResponse,
  type GetTopArtistsInput,
  type GetTopArtistsResponse,
  type GetTopTracksInput,
  type GetTopTracksResponse,
  type RecentTrack,
  type TopAlbum,
  type TopArtist,
  type TopTrack,
  type UserInfo,
};
