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

describe("ThreadsController integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  let userACookie: string;
  let userBCookie: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    userACookie = await registerAndGetSessionCookie(
      server,
      `threads-user-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `threads-user-b-${Date.now()}@example.com`,
    );
  }, 120_000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE threads RESTART IDENTITY CASCADE");
  });

  // ---------------------------------------------------------------------------
  // GET /threads
  // ---------------------------------------------------------------------------
  describe("GET /threads", () => {
    it("returns an empty array when the user has no threads", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get("/threads")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it("returns only the current user's threads", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({ localId: "ext-a" })
        .expect(201);

      await server
        .post("/threads")
        .set("Cookie", userBCookie)
        .send({ localId: "ext-b" })
        .expect(201);

      const res = await server
        .get("/threads")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].externalId).toBe("ext-a");
    });

    it("returns threads ordered by createdAt descending", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({ localId: "first" })
        .expect(201);

      await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({ localId: "second" })
        .expect(201);

      const res = await server
        .get("/threads")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].externalId).toBe("second");
      expect(res.body[1].externalId).toBe("first");
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer()).get("/threads").expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /threads
  // ---------------------------------------------------------------------------
  describe("POST /threads", () => {
    it("creates a thread and returns the created resource", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/threads")
        .set("Cookie", userACookie)
        .send({ localId: "my-local-id" })
        .expect(201);

      expect(res.body).toMatchObject({
        externalId: "my-local-id",
        title: "New Thread",
        isArchived: false,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
    });

    it("creates a thread without a localId", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.externalId).toBeNull();
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .post("/threads")
        .send({ localId: "x" })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /threads/:id
  // ---------------------------------------------------------------------------
  describe("GET /threads/:id", () => {
    it("returns the thread by ID", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({ localId: "get-test" })
        .expect(201);

      const res = await server
        .get(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toMatchObject({
        id: created.body.id,
        externalId: "get-test",
      });
    });

    it("returns 404 for a non-existent thread ID", async () => {
      await request(testApp.app.getHttpServer())
        .get("/threads/550e8400-e29b-41d4-a716-446655440000")
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 404 when fetching another user's thread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({ localId: "private" })
        .expect(201);

      await server
        .get(`/threads/${created.body.id}`)
        .set("Cookie", userBCookie)
        .expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /threads/:id  (updateThreadTitle)
  // ---------------------------------------------------------------------------
  describe("PATCH /threads/:id", () => {
    it("updates the thread title", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      const patchRes = await server
        .patch(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .send({ title: "Renamed Thread" })
        .expect(200);

      expect(patchRes.body).toEqual({ success: true });

      const getRes = await server
        .get(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(getRes.body.title).toBe("Renamed Thread");
    });

    it("returns 200 even when thread not found (service returns null)", async () => {
      // The current service implementation doesn't throw on missing thread —
      // the contract simply returns { success: true }. This test documents
      // the actual behavior so a future change is caught.
      await request(testApp.app.getHttpServer())
        .patch("/threads/550e8400-e29b-41d4-a716-446655440000")
        .set("Cookie", userACookie)
        .send({ title: "Ghost" })
        .expect(200);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /threads/:id/archive  &  POST /threads/:id/unarchive
  // ---------------------------------------------------------------------------
  describe("POST /threads/:id/archive and /unarchive", () => {
    it("archives a thread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      await server
        .post(`/threads/${created.body.id}/archive`)
        .set("Cookie", userACookie)
        .expect(200);

      const getRes = await server
        .get(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(getRes.body.isArchived).toBe(true);
    });

    it("unarchives a previously archived thread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      await server
        .post(`/threads/${created.body.id}/archive`)
        .set("Cookie", userACookie)
        .expect(200);

      await server
        .post(`/threads/${created.body.id}/unarchive`)
        .set("Cookie", userACookie)
        .expect(200);

      const getRes = await server
        .get(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(getRes.body.isArchived).toBe(false);
    });

    it("does not let user B archive user A's thread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      // Service returns null (no row found for user B), controller still returns 200,
      // but the thread must remain unchanged.
      await server
        .post(`/threads/${created.body.id}/archive`)
        .set("Cookie", userBCookie)
        .expect(200);

      const getRes = await server
        .get(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(getRes.body.isArchived).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /threads/:id
  // ---------------------------------------------------------------------------
  describe("DELETE /threads/:id", () => {
    it("deletes a thread and makes it no longer retrievable", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      await server
        .delete(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      await server
        .get(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("does not let user B delete user A's thread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      await server
        .delete(`/threads/${created.body.id}`)
        .set("Cookie", userBCookie)
        .expect(200);

      // Thread still exists for user A
      await server
        .get(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /threads/:id/title  (generateThreadTitle)
  // ---------------------------------------------------------------------------
  describe("POST /threads/:id/title", () => {
    it("sets the title from the first user text message", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      const res = await server
        .post(`/threads/${created.body.id}/title`)
        .set("Cookie", userACookie)
        .send({
          messages: [
            { role: "user", content: "Hello, what is TypeScript?" },
            {
              role: "assistant",
              content: "TypeScript is a superset of JavaScript.",
            },
          ],
        })
        .expect(200);

      expect(res.body.title).toBe("Hello, what is TypeScript?");

      const getRes = await server
        .get(`/threads/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(getRes.body.title).toBe("Hello, what is TypeScript?");
    });

    it("truncates the title to 50 characters", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      const longMessage = "A".repeat(100);

      const res = await server
        .post(`/threads/${created.body.id}/title`)
        .set("Cookie", userACookie)
        .send({ messages: [{ role: "user", content: longMessage }] })
        .expect(200);

      expect(res.body.title).toHaveLength(50);
    });

    it("falls back to 'New Chat' when there are no user messages", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      const res = await server
        .post(`/threads/${created.body.id}/title`)
        .set("Cookie", userACookie)
        .send({ messages: [] })
        .expect(200);

      expect(res.body.title).toBe("New Chat");
    });

    it("extracts text from a content-parts array", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      const res = await server
        .post(`/threads/${created.body.id}/title`)
        .set("Cookie", userACookie)
        .send({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Content part message" },
                {
                  type: "image_url",
                  image_url: { url: "http://example.com/img.png" },
                },
              ],
            },
          ],
        })
        .expect(200);

      expect(res.body.title).toBe("Content part message");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /threads/:id/messages
  // ---------------------------------------------------------------------------
  describe("GET /threads/:id/messages", () => {
    it("returns an empty messages array and null headId for a new thread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      const res = await server
        .get(`/threads/${created.body.id}/messages`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toEqual({ headId: null, messages: [] });
    });

    it("returns 404 for a non-existent thread", async () => {
      await request(testApp.app.getHttpServer())
        .get("/threads/550e8400-e29b-41d4-a716-446655440000/messages")
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 404 when fetching another user's thread messages", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      await server
        .get(`/threads/${created.body.id}/messages`)
        .set("Cookie", userBCookie)
        .expect(404);
    });

    it("returns messages and the correct headId after appending", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      const entry1 = {
        id: "msg-1",
        parent_id: null,
        format: "ai-sdk/v6",
        content: { role: "user", text: "Hello" },
      };
      const entry2 = {
        id: "msg-2",
        parent_id: "msg-1",
        format: "ai-sdk/v6",
        content: { role: "assistant", text: "Hi" },
      };

      await server
        .post(`/threads/${created.body.id}/messages`)
        .set("Cookie", userACookie)
        .send({ entry: entry1 })
        .expect(200);

      await server
        .post(`/threads/${created.body.id}/messages`)
        .set("Cookie", userACookie)
        .send({ entry: entry2 })
        .expect(200);

      const res = await server
        .get(`/threads/${created.body.id}/messages`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0]).toMatchObject(entry1);
      expect(res.body.messages[1]).toMatchObject(entry2);
      // headId should be the id of the last entry
      expect(res.body.headId).toBe("msg-2");
    });
  });

  // ---------------------------------------------------------------------------
  // POST /threads/:id/messages
  // ---------------------------------------------------------------------------
  describe("POST /threads/:id/messages", () => {
    it("appends a message entry to an empty thread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      const entry = {
        id: "msg-a",
        parent_id: null,
        format: "ai-sdk/v6",
        content: {},
      };

      const appendRes = await server
        .post(`/threads/${created.body.id}/messages`)
        .set("Cookie", userACookie)
        .send({ entry })
        .expect(200);

      expect(appendRes.body).toEqual({ success: true });
    });

    it("preserves message order across multiple appends", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      for (let i = 1; i <= 3; i++) {
        await server
          .post(`/threads/${created.body.id}/messages`)
          .set("Cookie", userACookie)
          .send({
            entry: {
              id: `msg-${i}`,
              parent_id: i === 1 ? null : `msg-${i - 1}`,
              order: i,
            },
          })
          .expect(200);
      }

      const res = await server
        .get(`/threads/${created.body.id}/messages`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.messages).toHaveLength(3);
      expect(res.body.messages.map((m: { id: string }) => m.id)).toEqual([
        "msg-1",
        "msg-2",
        "msg-3",
      ]);
      expect(res.body.headId).toBe("msg-3");
    });

    it("returns 404 when appending to a non-existent thread", async () => {
      await request(testApp.app.getHttpServer())
        .post("/threads/550e8400-e29b-41d4-a716-446655440000/messages")
        .set("Cookie", userACookie)
        .send({ entry: { id: "x" } })
        .expect(404);
    });

    it("returns 404 when appending to another user's thread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      await server
        .post(`/threads/${created.body.id}/messages`)
        .set("Cookie", userBCookie)
        .send({ entry: { id: "stolen" } })
        .expect(404);

      // Verify no message was actually appended
      const res = await server
        .get(`/threads/${created.body.id}/messages`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.messages).toHaveLength(0);
    });

    it("accepts arbitrary JSON as message entry content", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/threads")
        .set("Cookie", userACookie)
        .send({})
        .expect(201);

      const complexEntry = {
        id: "rich-msg",
        parent_id: null,
        format: "ai-sdk/v6",
        content: {
          role: "user",
          parts: [{ type: "text", text: "What is 2+2?" }],
          nested: { deeply: { value: 42 } },
        },
      };

      await server
        .post(`/threads/${created.body.id}/messages`)
        .set("Cookie", userACookie)
        .send({ entry: complexEntry })
        .expect(200);

      const res = await server
        .get(`/threads/${created.body.id}/messages`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.messages[0]).toMatchObject(complexEntry);
    });
  });
});
