import { z } from "zod";

import {
  lastFmListSchema,
  lastFmPaginatedMetaSchema,
  lastFmRawUserSchema,
  normalizeLastFmUser,
  type LastFmRequester,
  type LastFmRequestOptions,
} from "@/lib/lastfm/common";
import { lastFmTrackSchema } from "@/lib/lastfm/user-get-recent-tracks";

export const getFriendsInputSchema = z.object({
  limit: z.number().int().positive().max(200).default(50),
  user: z.string().min(1),
  page: z.number().int().positive().optional(),
  recentTracks: z.boolean().optional(),
});

const lastFmFriendSchema = lastFmRawUserSchema
  .extend({
    recenttrack: lastFmTrackSchema.optional(),
  })
  .transform((friend) => ({
    ...normalizeLastFmUser(friend),
    recentTrack: friend.recenttrack,
  }));

export const getFriendsResponseSchema = z.object({
  friends: z.object({
    user: lastFmListSchema(lastFmFriendSchema),
    "@attr": lastFmPaginatedMetaSchema,
  }),
});

export type GetFriendsInput = z.input<typeof getFriendsInputSchema>;
export type Friend = z.infer<typeof lastFmFriendSchema>;
export type GetFriendsResponse = {
  friends: Friend[];
  meta: z.infer<typeof lastFmPaginatedMetaSchema>;
};

type GetFriendsOptions = GetFriendsInput & LastFmRequestOptions;

export const createGetFriends =
  (requestLastFm: LastFmRequester) =>
  async ({ apiKey, fetcher, ...input }: GetFriendsOptions): Promise<GetFriendsResponse> => {
    const params = getFriendsInputSchema.parse(input);
    const searchParams = new URLSearchParams({
      method: "user.getfriends",
      user: params.user,
      limit: params.limit.toString(),
    });

    if (params.page !== undefined) {
      searchParams.set("page", params.page.toString());
    }

    if (params.recentTracks !== undefined) {
      searchParams.set("recenttracks", params.recentTracks ? "1" : "0");
    }

    const json = await requestLastFm(searchParams, { apiKey, fetcher });
    const data = getFriendsResponseSchema.parse(json);

    return {
      friends: data.friends.user,
      meta: data.friends["@attr"],
    };
  };
