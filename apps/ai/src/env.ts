import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1),
    BACKEND_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z
      .string()
      .url()
      .default("postgresql://username:password@localhost:5432/database"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(4111),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
