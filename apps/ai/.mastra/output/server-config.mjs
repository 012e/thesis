import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(4111)
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
});

const server = {
  port: env.PORT
};

export { server };
