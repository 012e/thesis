import { afterAll, beforeAll, describe, it } from "vitest";
import request from "supertest";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("authenticated MCP domains", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);
    testApp = await createTestApp(containers);
  }, 180000);

  afterAll(async () => {
    if (testApp) await closeTestApp(testApp);
    if (containers) await stopPostgresContainer(containers);
  });

  it.each(["/mcp/post-management/sse", "/mcp/tags/sse"])(
    "rejects unauthenticated requests to %s",
    async (endpoint) => {
      await request(testApp.app.getHttpServer()).get(endpoint).expect(401);
    },
  );
});
