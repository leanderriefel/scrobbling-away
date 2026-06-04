import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_LASTFM_KEY: z.string(),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
