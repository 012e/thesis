import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .url()
      .default('postgresql://username:password@localhost:5432/database'),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .default('changeme_random_string_1234567890'),
    BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    ALLOWED_ORIGINS: z
      .union([z.url().nonempty(), z.array(z.url().nonempty())])
      .default('http://localhost:5173'),
    KAFKA_BROKER: z.string().default('localhost:9092'),
    KAFKA_CLIENT_ID: z.string().default('auth-service'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
