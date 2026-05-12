import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import { registerAndGetSessionCookie } from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("ConfigController integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;
  let sessionCookie: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    sessionCookie = await registerAndGetSessionCookie(
      server,
      `config-user-${Date.now()}@example.com`,
    );
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE app_config");
  });

  describe("GET /config", () => {
    it("returns schema defaults when no rows are stored", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get("/config")
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.body).toMatchObject({
        feed: { defaultPageSize: 20 },
        ai: { model: "gpt-4o" },
        uploads: { maxFileSizeBytes: 10_000_000 },
      });
    });

    it("merges stored values with schema defaults", async () => {
      await pool.query(
        `INSERT INTO app_config (namespace, value) VALUES ('feed', '{"defaultPageSize": 50}')`,
      );

      const res = await request(testApp.app.getHttpServer())
        .get("/config")
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.body.feed.defaultPageSize).toBe(50);
      // Other namespaces still return defaults
      expect(res.body.ai.model).toBe("gpt-4o");
      expect(res.body.uploads.maxFileSizeBytes).toBe(10_000_000);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer()).get("/config").expect(401);
    });
  });

  describe("GET /config/:namespace", () => {
    it("returns schema defaults for a namespace with no stored row", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get("/config/feed")
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.body).toMatchObject({ defaultPageSize: 20 });
    });

    it("returns the stored value for a known namespace", async () => {
      await pool.query(
        `INSERT INTO app_config (namespace, value) VALUES ('ai', '{"model": "gpt-4o-mini"}')`,
      );

      const res = await request(testApp.app.getHttpServer())
        .get("/config/ai")
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.body).toMatchObject({ model: "gpt-4o-mini" });
    });

    it("returns 404 for an unknown namespace", async () => {
      await request(testApp.app.getHttpServer())
        .get("/config/unknown-namespace")
        .set("Cookie", sessionCookie)
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .get("/config/feed")
        .expect(401);
    });
  });

  describe("POST /config/:namespace", () => {
    it("persists a valid namespace value and returns the stored config", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/config/feed")
        .set("Cookie", sessionCookie)
        .send({ defaultPageSize: 30 })
        .expect(200);

      expect(res.body).toMatchObject({ defaultPageSize: 30 });

      // Verify it is persisted
      const getRes = await request(testApp.app.getHttpServer())
        .get("/config/feed")
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(getRes.body.defaultPageSize).toBe(30);
    });

    it("upserts when called twice for the same namespace", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post("/config/feed")
        .set("Cookie", sessionCookie)
        .send({ defaultPageSize: 10 })
        .expect(200);

      await server
        .post("/config/feed")
        .set("Cookie", sessionCookie)
        .send({ defaultPageSize: 99 })
        .expect(200);

      const res = await server
        .get("/config/feed")
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.body.defaultPageSize).toBe(99);
    });

    it("applies schema defaults for omitted fields", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/config/uploads")
        .set("Cookie", sessionCookie)
        .send({})
        .expect(200);

      expect(res.body.maxFileSizeBytes).toBe(10_000_000);
    });

    it("returns 400 for an invalid value", async () => {
      await request(testApp.app.getHttpServer())
        .post("/config/feed")
        .set("Cookie", sessionCookie)
        .send({ defaultPageSize: -1 })
        .expect(400);
    });

    it("returns 400 for an invalid enum value", async () => {
      await request(testApp.app.getHttpServer())
        .post("/config/ai")
        .set("Cookie", sessionCookie)
        .send({ model: "unknown-model" })
        .expect(400);
    });

    it("returns 404 for an unknown namespace", async () => {
      await request(testApp.app.getHttpServer())
        .post("/config/unknown-namespace")
        .set("Cookie", sessionCookie)
        .send({ foo: "bar" })
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .post("/config/feed")
        .send({ defaultPageSize: 10 })
        .expect(401);
    });
  });
});
