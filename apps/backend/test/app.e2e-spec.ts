import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createTestApp, closeTestApp } from './helpers/app.setup';
import { runBetterAuthMigrations } from './helpers/database.setup';
import {
  startTestContainers,
  stopTestContainers,
  type TestContainersContext,
} from './helpers/testcontainers.setup';

describe('AppController (e2e)', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: TestContainersContext;

  beforeAll(async () => {
    containers = await startTestContainers();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
  }, 120000);

  afterAll(async () => {
    await closeTestApp(testApp);
    await stopTestContainers(containers);
  });

  it('/ (GET)', () => {
    return request(testApp.app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
