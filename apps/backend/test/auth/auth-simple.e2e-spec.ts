import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeTestApp, createTestApp } from '../helpers/app.setup';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import {
  createTestAuthClient,
  TestAuthClient,
} from 'test/helpers/auth-client.helper';
import {
  startTestContainers,
  stopTestContainers,
  type TestContainersContext,
} from '../helpers/testcontainers.setup';

describe('Auth Integration Tests (Simple)', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: TestContainersContext;
  let authClient: TestAuthClient;

  beforeAll(async () => {
    containers = await startTestContainers();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    authClient = createTestAuthClient(testApp.app);
  }, 120000);

  afterAll(async () => {
    await closeTestApp(testApp);
    await stopTestContainers(containers);
  });

  describe('Better Auth endpoints', () => {
    it('should create a new user', async () => {
      const email = `test-${Date.now()}@example.com`;

      const { data, error } = await authClient.register({
        email,
        username: 'test username',
        password: 'TestPassword123!',
        name: 'Test User',
      });

      if (error) throw new Error('Registration failed');

      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(email);
    });

    it('should persist users and reject duplicate registrations', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      const firstResult = await authClient.register({
        email,
        username: `user-${Date.now()}`,
        password: 'TestPassword123!',
        name: 'First User',
      });

      if (firstResult.error) throw new Error('Initial registration failed');

      const secondResult = await authClient.register({
        email,
        username: `user-${Date.now()}-retry`,
        password: 'TestPassword123!',
        name: 'Second User',
      });

      expect(secondResult.error).toBeTruthy();
    });
  });
});
