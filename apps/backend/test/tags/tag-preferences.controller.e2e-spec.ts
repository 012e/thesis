import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { registerAndGetSession } from "../helpers/auth.helper";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("Tag preferences controller", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;
  let userCookie: string;
  let authorCookie: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    const suffix = Date.now();
    const userSession = await registerAndGetSession(
      server,
      `tagprefuser${suffix}@example.com`,
      `tagprefuser${suffix}`,
    );
    userCookie = userSession.cookie;

    const authorSession = await registerAndGetSession(
      server,
      `tagprefauthor${suffix}@example.com`,
      `tagprefauthor${suffix}`,
    );
    authorCookie = authorSession.cookie;
  }, 120000);

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE TABLE user_tag_preferences, recommendation_items, recommendation_batches, post_tags, tags, posts RESTART IDENTITY CASCADE",
    );

    await request(testApp.app.getHttpServer())
      .post("/posts")
      .set("Cookie", authorCookie)
      .send({ content: { text: "A post about #React and #TypeScript" } })
      .expect(201);
  });

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  it("sets, moves, lists, and deletes tag preferences", async () => {
    const preferred = await request(testApp.app.getHttpServer())
      .put("/users/me/tag-preferences/react")
      .set("Cookie", userCookie)
      .send({ preference: "preferred" })
      .expect(200);

    expect(preferred.body.slug).toBe("react");
    expect(preferred.body.preference).toBe("preferred");

    const blocked = await request(testApp.app.getHttpServer())
      .put("/users/me/tag-preferences/react")
      .set("Cookie", userCookie)
      .send({ preference: "blocked" })
      .expect(200);

    expect(blocked.body.slug).toBe("react");
    expect(blocked.body.preference).toBe("blocked");

    const listed = await request(testApp.app.getHttpServer())
      .get("/users/me/tag-preferences")
      .set("Cookie", userCookie)
      .expect(200);

    expect(listed.body.preferred).toEqual([]);
    expect(listed.body.blocked).toHaveLength(1);
    expect(listed.body.blocked[0].slug).toBe("react");

    await request(testApp.app.getHttpServer())
      .delete("/users/me/tag-preferences/react")
      .set("Cookie", userCookie)
      .expect(204);

    const afterDelete = await request(testApp.app.getHttpServer())
      .get("/users/me/tag-preferences")
      .set("Cookie", userCookie)
      .expect(200);

    expect(afterDelete.body).toEqual({ preferred: [], blocked: [] });
  });

  it("returns 404 when setting a preference for an unknown tag", async () => {
    await request(testApp.app.getHttpServer())
      .put("/users/me/tag-preferences/unknown")
      .set("Cookie", userCookie)
      .send({ preference: "preferred" })
      .expect(404);
  });
});
