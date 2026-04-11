import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_MASTRA_CHAT_URL: z.url().default('http://localhost:4111/chat'),
    VITE_BACKEND_URL: z.url().default('http://localhost:3000'),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
