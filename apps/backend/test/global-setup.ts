import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from './helpers/testcontainers.setup';
import { runBetterAuthMigrations } from './helpers/database.setup';

let globalContainers: PostgresContainerContext | null = null;
let initPromise: Promise<PostgresContainerContext> | null = null;

/**
 * Get or create shared test containers.
 * Containers are started only once and reused across all test files.
 */
export async function getTestContainers(): Promise<PostgresContainerContext> {
  if (globalContainers) {
    return globalContainers;
  }

  if (!initPromise) {
    initPromise = (async () => {
      console.log('Initializing shared test containers...');
      const containers = await startPostgresContainer();
      await runBetterAuthMigrations(containers.databaseUrl);
      globalContainers = containers;
      return containers;
    })();
  }

  return initPromise;
}

/**
 * Cleanup shared containers.
 * Should be called in global teardown.
 */
export async function cleanupTestContainers(): Promise<void> {
  if (globalContainers) {
    await stopPostgresContainer(globalContainers);
    globalContainers = null;
    initPromise = null;
  }
}
