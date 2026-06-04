import { z } from "zod";

import {
  lastFmUserSchema,
  type LastFmRequester,
  type LastFmRequestOptions,
} from "@/lib/lastfm/common";

export const getInfoInputSchema = z.object({
  user: z.string().min(1).optional(),
});

export const getInfoResponseSchema = z.object({
  user: lastFmUserSchema,
});

export type GetInfoInput = z.input<typeof getInfoInputSchema>;
export type UserInfo = z.infer<typeof lastFmUserSchema>;
export type GetInfoResponse = UserInfo;

type GetInfoOptions = GetInfoInput & LastFmRequestOptions;

export const createGetInfo =
  (requestLastFm: LastFmRequester) =>
  async ({ apiKey, fetcher, ...input }: GetInfoOptions = {}): Promise<GetInfoResponse> => {
    const params = getInfoInputSchema.parse(input);
    const searchParams = new URLSearchParams({
      method: "user.getinfo",
    });

    if (params.user !== undefined) {
      searchParams.set("user", params.user);
    }

    const json = await requestLastFm(searchParams, { apiKey, fetcher });
    const data = getInfoResponseSchema.parse(json);

    return data.user;
  };
