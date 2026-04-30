import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .url()
      .default("postgresql://username:password@localhost:5432/database"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .default("changeme_random_string_1234567890"),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3000),
    ALLOWED_ORIGINS: z
      .union([z.url().nonempty(), z.array(z.url().nonempty())])
      .default("http://localhost:5173"),
    AI_SERVICE_URL: z.url().default("http://localhost:4111"),
    // MinIO/S3 configuration
    MINIO_ENDPOINT: z.string().default("localhost"),
    MINIO_PORT: z.coerce.number().default(9000),
    MINIO_USE_SSL: z
      .string()
      .default("false")
      .transform((v) => v === "true"),
    MINIO_ACCESS_KEY: z.string().default("minioadmin"),
    MINIO_SECRET_KEY: z.string().default("minioadmin"),
    MINIO_BUCKET: z.string().default("posts-images"),
    MINIO_PUBLIC_URL: z.url().default("http://localhost:9000"),
    // Piston code execution engine
    PISTON_URL: z.url().default("http://localhost:2000"),
    // OpenAI — optional; when absent the stub (zero-vector) embedding service is used
    OPENAI_API_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
