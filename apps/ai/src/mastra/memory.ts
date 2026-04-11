import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';

import { env } from '../env';

export const pgStore = new PostgresStore({
  id: 'pg-storage',
  connectionString: env.DATABASE_URL,
});

/**
 * Shared Memory instance backed by PostgreSQL.
 *
 * Keeps the last 20 messages per thread and enables working memory so
 * the agent can persist user preferences and context across conversations.
 */
export const memory = new Memory({
  storage: pgStore,
  options: {
    lastMessages: 20,
    workingMemory: {
      enabled: true,
    },
  },
});
