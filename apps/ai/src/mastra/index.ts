import { Mastra } from '@mastra/core';

import { env } from '../env';
import { assistantAgent } from './agents/assistant';
import { streamRoute } from './routes/stream';

export const mastra = new Mastra({
  agents: { assistantAgent },
  server: {
    port: env.PORT,
    cors: {
      origin: '*',
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'Origin',
        'User-Agent',
        'Accept',
      ],
    },
    apiRoutes: [streamRoute],
  },
});
