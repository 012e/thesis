import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { Pool } from "pg";

import { DatabaseService } from "@/db/database.service";
import { analyticsEvents } from "@/db/schema";
import { DATABASE_POOL } from "@/db/tokens";
import { AnalyticsService } from "@/analytics/analytics.service";

import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("AnalyticsService integration", () => {
  let containers: PostgresContainerContext;
  let moduleRef: TestingModule;
  let pool: Pool;
  let databaseService: DatabaseService;
  let analyticsService: AnalyticsService;

  const testUserId = "test-user-id-001";
  const otherUserId = "test-user-id-002";

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    pool = new Pool({ connectionString: containers.databaseUrl });
    moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: DATABASE_POOL,
          useValue: pool,
        },
        DatabaseService,
        AnalyticsService,
      ],
    }).compile();

    databaseService = moduleRef.get(DatabaseService);
    analyticsService = moduleRef.get(AnalyticsService);
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await moduleRef.close();
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE analytics_events RESTART IDENTITY CASCADE");
  });

  // ─── ingestBatch ─────────────────────────────────────────────────────────────

  describe("ingestBatch", () => {
    it("inserts a single event and returns count of 1", async () => {
      const count = await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "post_view",
          metadata: { postId: "p1" },
          clientTimestamp: new Date("2025-01-01T00:00:00Z"),
        },
      ]);
      expect(count).toBe(1);
    });

    it("inserts multiple events and returns the correct count", async () => {
      const count = await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "post_view",
          metadata: { postId: "p1" },
          clientTimestamp: new Date("2025-01-01T00:00:00Z"),
        },
        {
          userId: testUserId,
          type: "post_like",
          metadata: { postId: "p2" },
          clientTimestamp: new Date("2025-01-01T00:01:00Z"),
        },
        {
          userId: testUserId,
          type: "search",
          metadata: { query: "hello world" },
          clientTimestamp: new Date("2025-01-01T00:02:00Z"),
        },
      ]);
      expect(count).toBe(3);
    });

    it("returns 0 when given an empty array", async () => {
      const count = await analyticsService.ingestBatch([]);
      expect(count).toBe(0);
    });

    it("stores null metadata when not provided", async () => {
      await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "page_view",
          metadata: null,
          clientTimestamp: new Date("2025-01-01T00:00:00Z"),
        },
      ]);

      const result = await analyticsService.getEventsByUser(testUserId);
      expect(result.items[0].metadata).toBeNull();
    });

    it("stores complex JSONB metadata correctly", async () => {
      const metadata = {
        postId: "p1",
        dwellTimeMs: 12500,
        scrollDepth: 0.85,
        tags: ["tech", "ai"],
        author: { id: "u1", name: "Test" },
      };

      await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "post_view",
          metadata,
          clientTimestamp: new Date("2025-01-01T00:00:00Z"),
        },
      ]);

      const result = await analyticsService.getEventsByUser(testUserId);
      expect(result.items[0].metadata).toEqual(metadata);
    });

    it("preserves the client timestamp", async () => {
      const clientTime = new Date("2025-06-15T10:30:00.000Z");

      await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "post_view",
          metadata: null,
          clientTimestamp: clientTime,
        },
      ]);

      const result = await analyticsService.getEventsByUser(testUserId);
      expect(result.items[0].clientTimestamp).toBe(clientTime.toISOString());
    });

    it("stores events for different users independently", async () => {
      await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "post_view",
          metadata: { user: "A" },
          clientTimestamp: new Date(),
        },
        {
          userId: otherUserId,
          type: "post_like",
          metadata: { user: "B" },
          clientTimestamp: new Date(),
        },
      ]);

      const resultA = await analyticsService.getEventsByUser(testUserId);
      const resultB = await analyticsService.getEventsByUser(otherUserId);

      expect(resultA.total).toBe(1);
      expect(resultA.items[0].type).toBe("post_view");
      expect(resultB.total).toBe(1);
      expect(resultB.items[0].type).toBe("post_like");
    });

    it("supports all event types", async () => {
      const allTypes = [
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

      const count = await analyticsService.ingestBatch(
        allTypes.map((type) => ({
          userId: testUserId,
          type,
          metadata: null,
          clientTimestamp: new Date(),
        })),
      );

      expect(count).toBe(allTypes.length);

      const result = await analyticsService.getEventsByUser(testUserId);
      expect(result.total).toBe(allTypes.length);

      const storedTypes = result.items.map((e) => e.type).sort();
      expect(storedTypes).toEqual([...allTypes].sort());
    });

    it("assigns unique UUIDs to each event", async () => {
      await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "page_view",
          metadata: null,
          clientTimestamp: new Date(),
        },
        {
          userId: testUserId,
          type: "page_view",
          metadata: null,
          clientTimestamp: new Date(),
        },
      ]);

      const result = await analyticsService.getEventsByUser(testUserId);
      expect(result.items[0].id).not.toBe(result.items[1].id);
    });

    it("handles a large batch (100 events) efficiently", async () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        userId: testUserId,
        type: "page_view" as const,
        metadata: { index: i },
        clientTimestamp: new Date(),
      }));

      const count = await analyticsService.ingestBatch(events);
      expect(count).toBe(100);

      const result = await analyticsService.getEventsByUser(testUserId, {
        limit: 100,
      });
      expect(result.total).toBe(100);
    });
  });

  // ─── getEventsByUser ────────────────────────────────────────────────────────

  describe("getEventsByUser", () => {
    it("returns empty items and zero total for a user with no events", async () => {
      const result = await analyticsService.getEventsByUser(testUserId);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("returns events only for the specified user", async () => {
      await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "post_view",
          metadata: null,
          clientTimestamp: new Date(),
        },
        {
          userId: otherUserId,
          type: "post_like",
          metadata: null,
          clientTimestamp: new Date(),
        },
      ]);

      const result = await analyticsService.getEventsByUser(testUserId);
      expect(result.total).toBe(1);
      expect(result.items[0].type).toBe("post_view");
    });

    it("applies limit correctly", async () => {
      await analyticsService.ingestBatch(
        Array.from({ length: 10 }, () => ({
          userId: testUserId,
          type: "page_view" as const,
          metadata: null,
          clientTimestamp: new Date(),
        })),
      );

      const result = await analyticsService.getEventsByUser(testUserId, {
        limit: 3,
      });
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(10);
    });

    it("applies offset correctly", async () => {
      await analyticsService.ingestBatch(
        Array.from({ length: 5 }, (_, i) => ({
          userId: testUserId,
          type: "page_view" as const,
          metadata: { index: i },
          clientTimestamp: new Date(),
        })),
      );

      const page1 = await analyticsService.getEventsByUser(testUserId, {
        limit: 2,
        offset: 0,
      });
      const page2 = await analyticsService.getEventsByUser(testUserId, {
        limit: 2,
        offset: 2,
      });

      expect(page1.items).toHaveLength(2);
      expect(page2.items).toHaveLength(2);

      const allIds = [...page1.items, ...page2.items].map((e) => e.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(4);
    });

    it("filters by event type", async () => {
      await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "post_view",
          metadata: null,
          clientTimestamp: new Date(),
        },
        {
          userId: testUserId,
          type: "post_view",
          metadata: null,
          clientTimestamp: new Date(),
        },
        {
          userId: testUserId,
          type: "post_like",
          metadata: null,
          clientTimestamp: new Date(),
        },
      ]);

      const result = await analyticsService.getEventsByUser(testUserId, {
        type: "post_view",
      });
      expect(result.total).toBe(2);
      result.items.forEach((e) => expect(e.type).toBe("post_view"));
    });

    it("returns zero total when filtering by a type that has no events", async () => {
      await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "post_view",
          metadata: null,
          clientTimestamp: new Date(),
        },
      ]);

      const result = await analyticsService.getEventsByUser(testUserId, {
        type: "search",
      });
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it("returns events sorted by createdAt descending", async () => {
      // Insert one at a time to ensure different timestamps
      for (let i = 0; i < 3; i++) {
        await analyticsService.ingestBatch([
          {
            userId: testUserId,
            type: "page_view",
            metadata: { order: i },
            clientTimestamp: new Date(),
          },
        ]);
      }

      const result = await analyticsService.getEventsByUser(testUserId);
      expect(result.items[0].metadata?.order).toBe(2);
      expect(result.items[2].metadata?.order).toBe(0);
    });

    it("uses default limit of 20 when not specified", async () => {
      await analyticsService.ingestBatch(
        Array.from({ length: 25 }, () => ({
          userId: testUserId,
          type: "page_view" as const,
          metadata: null,
          clientTimestamp: new Date(),
        })),
      );

      const result = await analyticsService.getEventsByUser(testUserId);
      expect(result.items).toHaveLength(20);
      expect(result.total).toBe(25);
    });

    it("returns correct DTO shape", async () => {
      await analyticsService.ingestBatch([
        {
          userId: testUserId,
          type: "post_view",
          metadata: { foo: "bar" },
          clientTimestamp: new Date("2025-06-01T00:00:00Z"),
        },
      ]);

      const result = await analyticsService.getEventsByUser(testUserId);
      const event = result.items[0];

      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("userId");
      expect(event).toHaveProperty("type");
      expect(event).toHaveProperty("metadata");
      expect(event).toHaveProperty("clientTimestamp");
      expect(event).toHaveProperty("createdAt");

      // Timestamps should be ISO strings
      expect(event.clientTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("combines type filter with limit and offset", async () => {
      await analyticsService.ingestBatch([
        ...Array.from({ length: 10 }, () => ({
          userId: testUserId,
          type: "post_view" as const,
          metadata: null,
          clientTimestamp: new Date(),
        })),
        ...Array.from({ length: 5 }, () => ({
          userId: testUserId,
          type: "search" as const,
          metadata: null,
          clientTimestamp: new Date(),
        })),
      ]);

      const result = await analyticsService.getEventsByUser(testUserId, {
        type: "post_view",
        limit: 3,
        offset: 2,
      });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(10);
      result.items.forEach((e) => expect(e.type).toBe("post_view"));
    });
  });
});
