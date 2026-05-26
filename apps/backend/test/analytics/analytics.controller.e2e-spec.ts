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

describe("AnalyticsController integration", () => {
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
      `analytics-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `analytics-b-${Date.now()}@example.com`,
    );
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE TABLE analytics_events RESTART IDENTITY CASCADE",
    );
  });

  // ─── POST /analytics/events (batch ingest) ──────────────────────────────────

  describe("POST /analytics/events", () => {
    it("ingests a single event and returns the count", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            {
              type: "post_view",
              timestamp: new Date().toISOString(),
              metadata: { postId: "00000000-0000-0000-0000-000000000001" },
            },
          ],
        })
        .expect(201);

      expect(res.body.ingested).toBe(1);
    });

    it("ingests multiple events in a batch", async () => {
      const now = new Date().toISOString();
      const res = await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            { type: "post_view", timestamp: now, metadata: { postId: "p1" } },
            { type: "post_like", timestamp: now, metadata: { postId: "p2" } },
            {
              type: "comment_create",
              timestamp: now,
              metadata: { commentId: "c1" },
            },
            { type: "page_view", timestamp: now, metadata: { route: "/home" } },
            { type: "search", timestamp: now, metadata: { query: "hello" } },
          ],
        })
        .expect(201);

      expect(res.body.ingested).toBe(5);
    });

    it("ingests events without metadata", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [{ type: "page_view", timestamp: new Date().toISOString() }],
        })
        .expect(201);

      expect(res.body.ingested).toBe(1);
    });

    it("ingests events with complex metadata (nested objects, arrays)", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            {
              type: "post_view",
              timestamp: new Date().toISOString(),
              metadata: {
                postId: "p1",
                dwellTimeMs: 5400,
                scrollDepth: 0.75,
                tags: ["tech", "news"],
                viewport: { width: 1920, height: 1080 },
              },
            },
          ],
        })
        .expect(201);

      expect(res.body.ingested).toBe(1);

      // Verify the metadata was stored correctly
      const eventsRes = await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .set("Cookie", userACookie)
        .expect(200);

      const event = eventsRes.body.items[0];
      expect(event.metadata.dwellTimeMs).toBe(5400);
      expect(event.metadata.scrollDepth).toBe(0.75);
      expect(event.metadata.tags).toEqual(["tech", "news"]);
      expect(event.metadata.viewport).toEqual({ width: 1920, height: 1080 });
    });

    it("supports all event types", async () => {
      const now = new Date().toISOString();
      const eventTypes = [
        "post_view",
        "post_like",
        "post_unlike",
        "post_bookmark",
        "post_unbookmark",
        "comment_create",
        "comment_like",
        "post_share",
        "post_create",
        "poll_vote",
        "search",
        "page_view",
      ];

      const events = eventTypes.map((type) => ({
        type,
        timestamp: now,
        metadata: { test: true },
      }));

      const res = await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({ events })
        .expect(201);

      expect(res.body.ingested).toBe(eventTypes.length);
    });

    it("rejects an empty events array", async () => {
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({ events: [] })
        .expect(400);
    });

    it("rejects when events array exceeds 100", async () => {
      const events = Array.from({ length: 101 }, (_, i) => ({
        type: "page_view",
        timestamp: new Date().toISOString(),
        metadata: { index: i },
      }));

      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({ events })
        .expect(400);
    });

    it("rejects an invalid event type", async () => {
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            {
              type: "invalid_type",
              timestamp: new Date().toISOString(),
            },
          ],
        })
        .expect(400);
    });

    it("rejects an event with an invalid timestamp", async () => {
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            {
              type: "post_view",
              timestamp: "not-a-date",
            },
          ],
        })
        .expect(400);
    });

    it("rejects request without body", async () => {
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .expect(400);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .send({
          events: [{ type: "post_view", timestamp: new Date().toISOString() }],
        })
        .expect(401);
    });

    it("associates events with the authenticated user (not another user)", async () => {
      const now = new Date().toISOString();

      // User A sends events
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            { type: "post_view", timestamp: now, metadata: { src: "userA" } },
          ],
        })
        .expect(201);

      // User B sends events
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userBCookie)
        .send({
          events: [
            { type: "post_like", timestamp: now, metadata: { src: "userB" } },
          ],
        })
        .expect(201);

      // User A should only see their events
      const aRes = await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .set("Cookie", userACookie)
        .expect(200);

      expect(aRes.body.items).toHaveLength(1);
      expect(aRes.body.items[0].type).toBe("post_view");
      expect(aRes.body.items[0].metadata.src).toBe("userA");

      // User B should only see their events
      const bRes = await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .set("Cookie", userBCookie)
        .expect(200);

      expect(bRes.body.items).toHaveLength(1);
      expect(bRes.body.items[0].type).toBe("post_like");
      expect(bRes.body.items[0].metadata.src).toBe("userB");
    });

    it("preserves the client timestamp in stored events", async () => {
      const clientTime = "2025-06-01T12:30:00.000Z";

      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [{ type: "post_view", timestamp: clientTime }],
        })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items[0].clientTimestamp).toBe(clientTime);
    });

    it("accepts exactly 100 events (max batch size)", async () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        type: "page_view",
        timestamp: new Date().toISOString(),
        metadata: { index: i },
      }));

      const res = await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({ events })
        .expect(201);

      expect(res.body.ingested).toBe(100);
    });
  });

  // ─── GET /analytics/events (list own events) ────────────────────────────────

  describe("GET /analytics/events", () => {
    it("returns an empty list and zero total when no events exist", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it("returns stored events with correct shape", async () => {
      const now = new Date().toISOString();

      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            { type: "post_view", timestamp: now, metadata: { postId: "p1" } },
          ],
        })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(1);

      const event = res.body.items[0];
      expect(event.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(event.type).toBe("post_view");
      expect(event.metadata).toEqual({ postId: "p1" });
      expect(event.clientTimestamp).toBe(now);
      expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("supports limit parameter", async () => {
      const now = new Date().toISOString();

      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: Array.from({ length: 5 }, (_, i) => ({
            type: "page_view",
            timestamp: now,
            metadata: { index: i },
          })),
        })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .get("/analytics/events?limit=2")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(5);
    });

    it("supports offset parameter for pagination", async () => {
      const now = new Date().toISOString();

      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: Array.from({ length: 5 }, (_, i) => ({
            type: "page_view",
            timestamp: now,
            metadata: { index: i },
          })),
        })
        .expect(201);

      const page1 = await request(testApp.app.getHttpServer())
        .get("/analytics/events?limit=2&offset=0")
        .set("Cookie", userACookie)
        .expect(200);

      const page2 = await request(testApp.app.getHttpServer())
        .get("/analytics/events?limit=2&offset=2")
        .set("Cookie", userACookie)
        .expect(200);

      expect(page1.body.items).toHaveLength(2);
      expect(page2.body.items).toHaveLength(2);

      // Items should be different
      const ids1 = page1.body.items.map((e: any) => e.id);
      const ids2 = page2.body.items.map((e: any) => e.id);
      expect(ids1).not.toEqual(ids2);
    });

    it("filters events by type", async () => {
      const now = new Date().toISOString();

      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            { type: "post_view", timestamp: now },
            { type: "post_view", timestamp: now },
            { type: "post_like", timestamp: now },
            { type: "page_view", timestamp: now },
          ],
        })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .get("/analytics/events?type=post_view")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(2);
      res.body.items.forEach((e: any) => {
        expect(e.type).toBe("post_view");
      });
    });

    it("returns events sorted by createdAt descending (most recent first)", async () => {
      // Insert events one by one to get different timestamps
      for (let i = 0; i < 3; i++) {
        await request(testApp.app.getHttpServer())
          .post("/analytics/events")
          .set("Cookie", userACookie)
          .send({
            events: [
              {
                type: "page_view",
                timestamp: new Date().toISOString(),
                metadata: { order: i },
              },
            ],
          })
          .expect(201);
      }

      const res = await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(3);
      // Most recently created event should have order=2
      expect(res.body.items[0].metadata.order).toBe(2);
      expect(res.body.items[2].metadata.order).toBe(0);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .expect(401);
    });

    it("does not leak events from other users", async () => {
      const now = new Date().toISOString();

      // User A creates events
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            { type: "post_view", timestamp: now, metadata: { user: "A" } },
            { type: "post_view", timestamp: now, metadata: { user: "A" } },
          ],
        })
        .expect(201);

      // User B creates events
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userBCookie)
        .send({
          events: [
            { type: "post_like", timestamp: now, metadata: { user: "B" } },
          ],
        })
        .expect(201);

      // User B should only see their own event
      const res = await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .set("Cookie", userBCookie)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].metadata.user).toBe("B");
    });

    it("returns events with null metadata when none was provided", async () => {
      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [{ type: "page_view", timestamp: new Date().toISOString() }],
        })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .get("/analytics/events")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items[0].metadata).toBeNull();
    });

    it("returns correct total when combined with type filter and pagination", async () => {
      const now = new Date().toISOString();

      await request(testApp.app.getHttpServer())
        .post("/analytics/events")
        .set("Cookie", userACookie)
        .send({
          events: [
            ...Array.from({ length: 5 }, () => ({
              type: "post_view",
              timestamp: now,
            })),
            ...Array.from({ length: 3 }, () => ({
              type: "post_like",
              timestamp: now,
            })),
          ],
        })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .get("/analytics/events?type=post_view&limit=2")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(5);
    });
  });
});
