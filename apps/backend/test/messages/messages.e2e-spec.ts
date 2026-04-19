import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import { registerAndGetSession } from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("MessagesController integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  // Three users: A follows B (so A can start a DM with B)
  let userACookie: string;
  let userBCookie: string;
  let userCCookie: string; // follows nobody / not followed by A

  let userAId: string;
  let userBId: string;
  let userCId: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());

    ({ cookie: userACookie, userId: userAId } = await registerAndGetSession(
      server,
      `msg-a-${Date.now()}@example.com`,
      `msg_a_${Date.now()}`,
    ));
    ({ cookie: userBCookie, userId: userBId } = await registerAndGetSession(
      server,
      `msg-b-${Date.now()}@example.com`,
      `msg_b_${Date.now()}`,
    ));
    ({ cookie: userCCookie, userId: userCId } = await registerAndGetSession(
      server,
      `msg-c-${Date.now()}@example.com`,
      `msg_c_${Date.now()}`,
    ));

    // A follows B so they can exchange DMs
    await server
      .post(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);
  }, 120_000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    // Truncate message-related tables; preserve users & follows
    await pool.query(
      "TRUNCATE TABLE direct_messages, conversations RESTART IDENTITY CASCADE",
    );
  });

  // ─── listConversations ─────────────────────────────────────────────────────

  describe("GET /conversations", () => {
    it("returns empty array when user has no conversations", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get("/conversations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it("returns conversations the current user participates in", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create a conversation between A and B
      await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const res = await server
        .get("/conversations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);

      const conv = res.body[0] as {
        id: string;
        otherUser: { id: string };
        lastMessage: null;
      };
      expect(conv.otherUser.id).toBe(userBId);
      expect(conv.lastMessage).toBeNull();
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .get("/conversations")
        .expect(401);
    });
  });

  // ─── startConversation ─────────────────────────────────────────────────────

  describe("POST /conversations", () => {
    it("creates a new conversation when A follows B", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      expect(res.body).toMatchObject({
        otherUser: { id: userBId },
        lastMessage: null,
      });
      expect(typeof res.body.id).toBe("string");
    });

    it("is idempotent — returns existing conversation on duplicate request", async () => {
      const server = request(testApp.app.getHttpServer());

      const first = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      // Second call returns same conversation with 200
      const second = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(200);

      expect(first.body.id).toBe(second.body.id);
    });

    it("returns 400 when trying to start a conversation with yourself", async () => {
      await request(testApp.app.getHttpServer())
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userAId })
        .expect(400);
    });

    it("returns 404 when A does not follow the recipient (C)", async () => {
      await request(testApp.app.getHttpServer())
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userCId })
        .expect(404);
    });

    it("returns 404 when recipient user does not exist", async () => {
      await request(testApp.app.getHttpServer())
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: "00000000-0000-0000-0000-000000000000" })
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .post("/conversations")
        .send({ recipientId: userBId })
        .expect(401);
    });
  });

  // ─── getConversation ───────────────────────────────────────────────────────

  describe("GET /conversations/:id", () => {
    it("returns the conversation for a participant", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      const res = await server
        .get(`/conversations/${convId}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.id).toBe(convId);
      expect(res.body.otherUser.id).toBe(userBId);
    });

    it("also returns the conversation for the other participant (B)", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      const res = await server
        .get(`/conversations/${convId}`)
        .set("Cookie", userBCookie)
        .expect(200);

      expect(res.body.id).toBe(convId);
      // From B's perspective, the other user is A
      expect(res.body.otherUser.id).toBe(userAId);
    });

    it("returns 403 when non-participant requests the conversation", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      await server
        .get(`/conversations/${convId}`)
        .set("Cookie", userCCookie)
        .expect(403);
    });

    it("returns 404 when conversation does not exist", async () => {
      await request(testApp.app.getHttpServer())
        .get("/conversations/00000000-0000-0000-0000-000000000000")
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .get("/conversations/00000000-0000-0000-0000-000000000000")
        .expect(401);
    });
  });

  // ─── sendMessage ──────────────────────────────────────────────────────────

  describe("POST /conversations/:id/messages", () => {
    it("sends a message and returns the message DTO", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      const res = await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userACookie)
        .send({ content: "Hello, B!" })
        .expect(201);

      expect(res.body).toMatchObject({
        conversationId: convId,
        senderId: userAId,
        content: "Hello, B!",
        type: "text",
        readAt: null,
      });
      expect(typeof res.body.id).toBe("string");
      expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("allows the other participant (B) to send a reply", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      const res = await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userBCookie)
        .send({ content: "Hey A!" })
        .expect(201);

      expect(res.body.senderId).toBe(userBId);
    });

    it("returns 403 when a non-participant tries to send a message", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userCCookie)
        .send({ content: "Intruder!" })
        .expect(403);
    });

    it("returns 404 when conversation does not exist", async () => {
      await request(testApp.app.getHttpServer())
        .post("/conversations/00000000-0000-0000-0000-000000000000/messages")
        .set("Cookie", userACookie)
        .send({ content: "ghost message" })
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .post("/conversations/00000000-0000-0000-0000-000000000000/messages")
        .send({ content: "ghost message" })
        .expect(401);
    });
  });

  // ─── listMessages ─────────────────────────────────────────────────────────

  describe("GET /conversations/:id/messages", () => {
    it("returns empty list when no messages exist", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      const res = await server
        .get(`/conversations/${convId}/messages`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.messages).toEqual([]);
      expect(res.body.nextCursor).toBeNull();
    });

    it("returns messages newest-first", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userACookie)
        .send({ content: "First" })
        .expect(201);

      // Small delay to guarantee distinct createdAt timestamps
      await new Promise((r) => setTimeout(r, 20));

      await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userACookie)
        .send({ content: "Second" })
        .expect(201);

      const res = await server
        .get(`/conversations/${convId}/messages`)
        .set("Cookie", userACookie)
        .expect(200);

      const contents = (res.body.messages as { content: string }[]).map(
        (m) => m.content,
      );
      expect(contents).toEqual(["Second", "First"]);
    });

    it("paginates with nextCursor when there are more messages than the limit", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      // Send 3 messages
      for (let i = 1; i <= 3; i++) {
        await server
          .post(`/conversations/${convId}/messages`)
          .set("Cookie", userACookie)
          .send({ content: `Message ${i}` })
          .expect(201);
        await new Promise((r) => setTimeout(r, 10));
      }

      // Request with limit=2 — should get 2 messages and a cursor
      const page1 = await server
        .get(`/conversations/${convId}/messages?limit=2`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(page1.body.messages).toHaveLength(2);
      expect(typeof page1.body.nextCursor).toBe("string");

      // Fetch page 2 using the cursor
      const cursor = page1.body.nextCursor as string;
      const page2 = await server
        .get(
          `/conversations/${convId}/messages?limit=2&before=${encodeURIComponent(cursor)}`,
        )
        .set("Cookie", userACookie)
        .expect(200);

      expect(page2.body.messages).toHaveLength(1);
      expect(page2.body.nextCursor).toBeNull();
    });

    it("returns 403 for non-participants", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      await server
        .get(`/conversations/${convId}/messages`)
        .set("Cookie", userCCookie)
        .expect(403);
    });

    it("returns 404 when conversation does not exist", async () => {
      await request(testApp.app.getHttpServer())
        .get("/conversations/00000000-0000-0000-0000-000000000000/messages")
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .get("/conversations/00000000-0000-0000-0000-000000000000/messages")
        .expect(401);
    });

    it("lastMessage on the conversation is updated after sending", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userACookie)
        .send({ content: "Ping!" })
        .expect(201);

      const convRes = await server
        .get(`/conversations/${convId}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(convRes.body.lastMessage).not.toBeNull();
      expect(convRes.body.lastMessage.content).toBe("Ping!");
    });
  });

  // ─── getUnreadCount ───────────────────────────────────────────────────────

  describe("GET /conversations/unread-count", () => {
    it("returns 0 when the user has no conversations", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get("/conversations/unread-count")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toEqual({ total: 0 });
    });

    it("returns 0 when conversations exist but no messages have been sent", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const res = await server
        .get("/conversations/unread-count")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toEqual({ total: 0 });
    });

    it("counts messages sent by the other participant as unread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      // B sends 2 messages to A
      await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userBCookie)
        .send({ content: "Hello A!" })
        .expect(201);

      await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userBCookie)
        .send({ content: "Are you there?" })
        .expect(201);

      // A's unread count should be 2
      const res = await server
        .get("/conversations/unread-count")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toEqual({ total: 2 });
    });

    it("does not count messages sent by the requesting user as unread", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      // A sends a message — should not appear in A's own unread count
      await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userACookie)
        .send({ content: "I sent this" })
        .expect(201);

      const res = await server
        .get("/conversations/unread-count")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toEqual({ total: 0 });
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .get("/conversations/unread-count")
        .expect(401);
    });
  });

  // ─── markConversationRead ─────────────────────────────────────────────────

  describe("POST /conversations/:id/read", () => {
    it("marks all unread messages as read, bringing unread count to 0", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      // B sends 3 messages to A
      for (const content of ["Msg 1", "Msg 2", "Msg 3"]) {
        await server
          .post(`/conversations/${convId}/messages`)
          .set("Cookie", userBCookie)
          .send({ content })
          .expect(201);
      }

      // Verify A has 3 unread before marking
      const before = await server
        .get("/conversations/unread-count")
        .set("Cookie", userACookie)
        .expect(200);
      expect(before.body.total).toBe(3);

      // A marks the conversation as read
      await server
        .post(`/conversations/${convId}/read`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      // Unread count should now be 0
      const after = await server
        .get("/conversations/unread-count")
        .set("Cookie", userACookie)
        .expect(200);
      expect(after.body.total).toBe(0);
    });

    it("does not affect messages sent by the user themselves", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      // A sends a message, then calls read — own messages should not be touched
      await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userACookie)
        .send({ content: "From A" })
        .expect(201);

      await server
        .post(`/conversations/${convId}/read`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      // B's unread count: A sent 1 message, which B hasn't read
      const res = await server
        .get("/conversations/unread-count")
        .set("Cookie", userBCookie)
        .expect(200);
      expect(res.body.total).toBe(1);
    });

    it("is idempotent — calling read twice does not error", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      await server
        .post(`/conversations/${convId}/messages`)
        .set("Cookie", userBCookie)
        .send({ content: "Hi" })
        .expect(201);

      await server
        .post(`/conversations/${convId}/read`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      // Second call must also succeed
      await server
        .post(`/conversations/${convId}/read`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);
    });

    it("returns 403 when a non-participant calls read", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/conversations")
        .set("Cookie", userACookie)
        .send({ recipientId: userBId })
        .expect(201);

      const convId = created.body.id as string;

      await server
        .post(`/conversations/${convId}/read`)
        .set("Cookie", userCCookie)
        .send({})
        .expect(403);
    });

    it("returns 404 when conversation does not exist", async () => {
      await request(testApp.app.getHttpServer())
        .post("/conversations/00000000-0000-0000-0000-000000000000/read")
        .set("Cookie", userACookie)
        .send({})
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .post("/conversations/00000000-0000-0000-0000-000000000000/read")
        .send({})
        .expect(401);
    });
  });
});
