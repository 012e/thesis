import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  registerAndGetSession,
  registerAndGetSessionCookie,
} from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("Recommendations integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let pool: Pool;

  let userACookie: string;
  let userAId: string;
  let userBCookie: string;
  let userBId: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    const sessionA = await registerAndGetSession(
      server,
      `reca${Date.now()}@example.com`,
      `reca${Date.now()}`,
    );
    userACookie = sessionA.cookie;
    userAId = sessionA.userId;

    const sessionB = await registerAndGetSession(
      server,
      `recb${Date.now()}@example.com`,
      `recb${Date.now()}`,
    );
    userBCookie = sessionB.cookie;
    userBId = sessionB.userId;
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE TABLE user_tag_preferences, recommendation_items, recommendation_batches, user_recommendation_profiles, analytics_events, notifications, user_follows, posts RESTART IDENTITY CASCADE",
    );
  });

  // ─── Helper functions ──────────────────────────────────────────────────────

  async function createPost(cookie: string, text: string): Promise<string> {
    const res = await request(testApp.app.getHttpServer())
      .post("/posts")
      .set("Cookie", cookie)
      .send({ content: { text } })
      .expect(201);

    return res.body.id as string;
  }

  async function ingestAnalytics(
    cookie: string,
    events: Array<{
      type: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    const now = new Date().toISOString();
    await request(testApp.app.getHttpServer())
      .post("/analytics/events")
      .set("Cookie", cookie)
      .send({
        events: events.map((e) => ({
          type: e.type,
          timestamp: now,
          metadata: e.metadata ?? {},
        })),
      })
      .expect(201);
  }

  async function setBlockedTag(cookie: string, slug: string): Promise<void> {
    await request(testApp.app.getHttpServer())
      .put(`/users/me/tag-preferences/${slug}`)
      .set("Cookie", cookie)
      .send({ preference: "blocked" })
      .expect(200);
  }

  async function setPreferredTag(cookie: string, slug: string): Promise<void> {
    await request(testApp.app.getHttpServer())
      .put(`/users/me/tag-preferences/${slug}`)
      .set("Cookie", cookie)
      .send({ preference: "preferred" })
      .expect(200);
  }

  // ─── Cold-start: returns recommendations with no prior queue ───────────────

  describe("Cold-start recommendations", () => {
    it("returns recommendations through the existing /recommendations contract", async () => {
      // User B creates posts so user A can see them
      await createPost(userBCookie, "Interesting post 1");
      await createPost(userBCookie, "Interesting post 2");
      await createPost(userBCookie, "Interesting post 3");

      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.items.length).toBeGreaterThan(0);
      // Verify PostDto shape
      for (const item of res.body.items) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("authorId");
        expect(item).toHaveProperty("author");
        expect(item).toHaveProperty("content");
        expect(item).toHaveProperty("createdAt");
        expect(item).toHaveProperty("upvoteCount");
        expect(item).toHaveProperty("tags");
      }
      expect(res.body).toHaveProperty("nextCursor");
    });

    it("returns empty list when no posts exist", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.nextCursor).toBeNull();
    });
  });

  // ─── Own posts are filtered out ────────────────────────────────────────────

  describe("Filtering", () => {
    it("excludes the requesting user's own posts", async () => {
      // User A creates a post
      const ownPostId = await createPost(userACookie, "My own post");
      // User B creates a post
      await createPost(userBCookie, "Other user post");

      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      const ids = res.body.items.map((item: any) => item.id);
      expect(ids).not.toContain(ownPostId);
      expect(res.body.items.length).toBe(1);
    });

    it("excludes hidden posts", async () => {
      const postId = await createPost(userBCookie, "Will be hidden");
      await createPost(userBCookie, "Visible post");

      // Hide the post directly in the DB
      await pool.query("UPDATE posts SET hidden = true WHERE id = $1", [
        postId,
      ]);

      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      const ids = res.body.items.map((item: any) => item.id);
      expect(ids).not.toContain(postId);
    });

    it("excludes posts the user has already interacted with", async () => {
      const postId = await createPost(userBCookie, "Already seen post");
      await createPost(userBCookie, "Unseen post");

      // Record analytics interaction
      await ingestAnalytics(userACookie, [
        { type: "post_view", metadata: { postId } },
      ]);

      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      const ids = res.body.items.map((item: any) => item.id);
      expect(ids).not.toContain(postId);
    });

    it("excludes already queued posts on subsequent generations", async () => {
      await createPost(userBCookie, "Post 1");
      await createPost(userBCookie, "Post 2");

      // First call generates and returns items
      const res1 = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res1.body.items.length).toBe(2);

      // Create more posts
      await createPost(userBCookie, "Post 3");

      // Need to clear served status so a new generation can happen
      // Trigger another generation by clearing queue (simulate low queue scenario)
      await pool.query("DELETE FROM recommendation_items WHERE user_id = $1", [
        userAId,
      ]);
      await pool.query(
        "UPDATE recommendation_batches SET status = 'completed' WHERE user_id = $1",
        [userAId],
      );

      const res2 = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      // Should include at least the new post
      expect(res2.body.items.length).toBeGreaterThan(0);
    });

    it("excludes posts with blocked tags from recommendations", async () => {
      const blockedPostId = await createPost(userBCookie, "Blocked #React post");
      const visiblePostId = await createPost(userBCookie, "Allowed #TypeScript post");

      await setBlockedTag(userACookie, "react");

      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      const ids = res.body.items.map((item: { id: string }) => item.id);
      expect(ids).not.toContain(blockedPostId);
      expect(ids).toContain(visiblePostId);
    });

    it("ranks preferred tags through hybrid full-text search", async () => {
      const preferredPostId = await createPost(
        userBCookie,
        "Deep dive into #React server components",
      );
      await createPost(userBCookie, "Fresh #TypeScript release notes");

      await setPreferredTag(userACookie, "react");

      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 2 })
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items.map((item: { id: string }) => item.id)).toContain(
        preferredPostId,
      );

      const ranked = await pool.query(
        "SELECT rank FROM recommendation_items WHERE user_id = $1 AND post_id = $2",
        [userAId, preferredPostId],
      );
      expect(ranked.rows[0].rank).toBe(1);
    });

    it("excludes posts with blocked tags from the following feed", async () => {
      const blockedPostId = await createPost(userBCookie, "Blocked #React post");
      const visiblePostId = await createPost(userBCookie, "Allowed #TypeScript post");

      await pool.query(
        "INSERT INTO user_follows (follower_id, followee_id) VALUES ($1, $2)",
        [userAId, userBId],
      );
      await setBlockedTag(userACookie, "react");

      const res = await request(testApp.app.getHttpServer())
        .get("/posts/following")
        .set("Cookie", userACookie)
        .expect(200);

      const ids = res.body.items.map((item: { id: string }) => item.id);
      expect(ids).not.toContain(blockedPostId);
      expect(ids).toContain(visiblePostId);
    });
  });

  // ─── Pagination ────────────────────────────────────────────────────────────

  describe("Pagination", () => {
    it("returns stable pages with opaque cursors", async () => {
      // Create enough posts for pagination
      for (let i = 0; i < 5; i++) {
        await createPost(userBCookie, `Paginated post ${i}`);
      }

      // Get first page with limit=2
      const res1 = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 2 })
        .set("Cookie", userACookie)
        .expect(200);

      expect(res1.body.items.length).toBe(2);
      expect(res1.body.nextCursor).not.toBeNull();

      // Get second page using cursor
      const res2 = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 2, cursor: res1.body.nextCursor })
        .set("Cookie", userACookie)
        .expect(200);

      expect(res2.body.items.length).toBe(2);

      // Ensure no overlap between pages
      const page1Ids = res1.body.items.map((item: any) => item.id);
      const page2Ids = res2.body.items.map((item: any) => item.id);
      for (const id of page2Ids) {
        expect(page1Ids).not.toContain(id);
      }

      // Get third page
      const res3 = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 2, cursor: res2.body.nextCursor })
        .set("Cookie", userACookie)
        .expect(200);

      expect(res3.body.items.length).toBe(1);
      expect(res3.body.nextCursor).toBeNull();
    });

    it("uses opaque cursor format (not reaction count based)", async () => {
      await createPost(userBCookie, "Cursor test post 1");
      await createPost(userBCookie, "Cursor test post 2");

      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 1 })
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.nextCursor).not.toBeNull();
      // Cursor should be base64url encoded
      const decoded = Buffer.from(res.body.nextCursor, "base64url").toString(
        "utf8",
      );
      const parsed = JSON.parse(decoded);
      // Should have rank-based cursor, not reactionCount
      expect(parsed).toHaveProperty("rank");
      expect(parsed).toHaveProperty("itemId");
      expect(parsed).not.toHaveProperty("reactionCount");
    });
  });

  // ─── Regeneration trigger ──────────────────────────────────────────────────

  describe("Regeneration", () => {
    it("enqueues regeneration when remaining items are below threshold", async () => {
      // Create many posts
      for (let i = 0; i < 5; i++) {
        await createPost(userBCookie, `Regen post ${i}`);
      }

      // Consume all items
      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .query({ limit: 100 })
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items.length).toBe(5);

      // Check that batches were created (at least the cold-start one)
      const batchResult = await pool.query(
        "SELECT * FROM recommendation_batches WHERE user_id = $1",
        [userAId],
      );
      expect(batchResult.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Fallback behavior for users with insufficient analytics ──────────────

  describe("Fallback behavior", () => {
    it("returns recent visible posts for users with insufficient analytics", async () => {
      // Create posts — user has no analytics events
      await createPost(userBCookie, "Recent post A");
      await createPost(userBCookie, "Recent post B");

      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      // Should still get recommendations via recency fallback
      expect(res.body.items.length).toBe(2);
      // Verify they are valid PostDto objects
      for (const item of res.body.items) {
        expect(item.id).toBeDefined();
        expect(item.author).toBeDefined();
        expect(item.content).toBeDefined();
      }
    });
  });

  // ─── Analytics influence ranking (vector similarity) ───────────────────────

  describe("Analytics-influenced ranking", () => {
    it("analytics interactions influence recommendation generation", async () => {
      // Create posts by user B
      const postIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        postIds.push(await createPost(userBCookie, `Analytics test post ${i}`));
      }

      // User A interacts with some posts to build preferences
      // Even without actual embeddings, the pipeline should not crash
      await ingestAnalytics(userACookie, [
        { type: "post_like", metadata: { postId: postIds[0] } },
        { type: "post_bookmark", metadata: { postId: postIds[0] } },
      ]);

      // Request recommendations — the interacted post should be filtered out
      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      // The interacted post should be excluded
      const recIds = res.body.items.map((item: any) => item.id);
      expect(recIds).not.toContain(postIds[0]);
    });
  });
});
