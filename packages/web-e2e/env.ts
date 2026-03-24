import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PLAYWRIGHT_BASE_URL: z.url().default("http://localhost:5173"),
    CI: z.coerce.boolean().default(false),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
