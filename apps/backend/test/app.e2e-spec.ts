import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import { createTestApp, closeTestApp } from "./helpers/app.setup";
import { runBetterAuthMigrations } from "./helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "./helpers/testcontainers.setup";

describe("AppController (e2e)", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
  }, 180000);

  afterAll(async () => {
    if (testApp) {
      await closeTestApp(testApp);
    }
    if (containers) {
      await stopPostgresContainer(containers);
    }
  });

  it("/ (GET)", () => {
    return request(testApp.app.getHttpServer())
      .get("/")
      .expect(200)
      .expect("Hello World!");
  });

  it("/openapi (GET)", async () => {
    const response = await request(testApp.app.getHttpServer())
      .get("/openapi")
      .expect(200);

    expect(response.body).toHaveProperty("openapi");
    expect(response.body.info.title).toBe("Posts API");
  });
});
