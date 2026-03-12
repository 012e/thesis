import {
  startTestContainers,
  stopTestContainers,
  type TestContainersContext,
} from './helpers/testcontainers.setup';
import { runBetterAuthMigrations } from './helpers/database.setup';

let globalContainers: TestContainersContext | null = null;
let initPromise: Promise<TestContainersContext> | null = null;

/**
 * Get or create shared test containers
 * This ensures containers are started only once across all test files
 */
export async function getTestContainers(): Promise<TestContainersContext> {
  if (globalContainers) {
    return globalContainers;
  }

  if (!initPromise) {
    initPromise = (async () => {
      console.log('Initializing shared test containers...');
      const containers = await startTestContainers();
      await runBetterAuthMigrations(containers.databaseUrl);
      globalContainers = containers;
      return containers;
    })();
  }

  return initPromise;
}

/**
 * Cleanup shared containers
 * Should be called in global teardown
 */
export async function cleanupTestContainers(): Promise<void> {
  if (globalContainers) {
    await stopTestContainers(globalContainers);
    globalContainers = null;
    initPromise = null;
  }
}
