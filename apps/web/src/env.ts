import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_MASTRA_CHAT_URL: z
      .string()
      .url()
      .default("http://localhost:4111/chat/assistant"),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
