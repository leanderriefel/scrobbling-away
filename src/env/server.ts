import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    VITE_LASTFM_KEY: z.string(),
    LASTFM_SECRET: z.string(),
    SPOTIFY_KEY: z.string(),
    SPOTIFY_SECRET: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
