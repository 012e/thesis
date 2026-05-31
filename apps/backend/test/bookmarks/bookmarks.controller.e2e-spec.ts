import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import { registerAndGetSession } from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  startMinioContainer,
  stopMinioContainer,
  type PostgresContainerContext,
  type MinioContainerContext,
} from "../helpers/testcontainers.setup";

describe("Bookmarks integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let minioContainer: MinioContainerContext;
  let pool: Pool;

  let userACookie: string;
  let userAId: string;
  let userBCookie: string;
  let userBId: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    minioContainer = await startMinioContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers, undefined, minioContainer);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());

    const sessionA = await registerAndGetSession(
      server,
      `bkmk-a-${Date.now()}@example.com`,
      `bkmk_a_${Date.now()}`,
    );
    userACookie = sessionA.cookie;
    userAId = sessionA.userId;

    const sessionB = await registerAndGetSession(
      server,
      `bkmk-b-${Date.now()}@example.com`,
      `bkmk_b_${Date.now()}`,
    );
    userBCookie = sessionB.cookie;
    userBId = sessionB.userId;
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
    await stopMinioContainer(minioContainer);
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE TABLE post_bookmarks, notifications, posts RESTART IDENTITY CASCADE",
    );
  });

  // ----- Helper -----
  async function createPost(cookie: string, text: string): Promise<string> {
    const res = await request(testApp.app.getHttpServer())
      .post("/posts")
      .set("Cookie", cookie)
      .send({ content: { text } })
      .expect(201);
    return res.body.id as string;
  }

  // ============================================================
  // POST /posts/:id/bookmark
  // ============================================================
  describe("POST /posts/:id/bookmark", () => {
    it("bookmarks a post and returns bookmark summary", async () => {
      const postId = await createPost(userACookie, "Post to bookmark");

      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      expect(res.body).toMatchObject({
        postId,
      });
      expect(res.body.createdAt).toBeDefined();
    });

    it("is idempotent — bookmarking twice returns success both times", async () => {
      const postId = await createPost(userACookie, "Idempotent bookmark");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      expect(res.body.postId).toBe(postId);
    });

    it("returns 404 for non-existent post", async () => {
      await request(testApp.app.getHttpServer())
        .post("/posts/00000000-0000-0000-0000-000000000000/bookmark")
        .set("Cookie", userACookie)
        .send({})
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      const postId = await createPost(userACookie, "Unauth bookmark");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .send({})
        .expect(401);
    });

    it("does not affect other users' bookmark state", async () => {
      const postId = await createPost(userACookie, "Private bookmark");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      // User B should see the post as not bookmarked
      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}`)
        .set("Cookie", userBCookie)
        .expect(200);

      expect(res.body.currentUserBookmarked).toBe(false);
    });
  });

  // ============================================================
  // DELETE /posts/:id/bookmark
  // ============================================================
  describe("DELETE /posts/:id/bookmark", () => {
    it("unbookmarks a previously bookmarked post", async () => {
      const postId = await createPost(userACookie, "To unbookmark");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .delete(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.postId).toBe(postId);
    });

    it("returns 404 when unbookmarking a non-bookmarked post", async () => {
      const postId = await createPost(userACookie, "Not bookmarked");

      // Unbookmarking a post that wasn't bookmarked — the bookmark row doesn't
      // exist so the DELETE returning nothing is treated as 404 in our controller
      const res = await request(testApp.app.getHttpServer())
        .delete(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie);

      expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent post", async () => {
      await request(testApp.app.getHttpServer())
        .delete("/posts/00000000-0000-0000-0000-000000000000/bookmark")
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      const postId = await createPost(userACookie, "Unauth unbookmark");

      await request(testApp.app.getHttpServer())
        .delete(`/posts/${postId}/bookmark`)
        .expect(401);
    });
  });

  // ============================================================
  // Bookmark state in post responses
  // ============================================================
  describe("currentUserBookmarked field", () => {
    it("is false by default for GET /posts", async () => {
      await createPost(userACookie, "Check default bookmark state");

      const res = await request(testApp.app.getHttpServer())
        .get("/posts")
        .set("Cookie", userACookie)
        .expect(200);

      for (const post of res.body) {
        expect(post.currentUserBookmarked).toBe(false);
      }
    });

    it("is true after bookmarking in GET /posts", async () => {
      const postId = await createPost(userACookie, "Bookmarked post");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .get("/posts")
        .set("Cookie", userACookie)
        .expect(200);

      const bookmarkedPost = res.body.find(
        (p: { id: string }) => p.id === postId,
      );
      expect(bookmarkedPost.currentUserBookmarked).toBe(true);
    });

    it("is false again after unbookmarking", async () => {
      const postId = await createPost(userACookie, "Bookmark then remove");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      await request(testApp.app.getHttpServer())
        .delete(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.currentUserBookmarked).toBe(false);
    });

    it("is true in GET /posts/:id after bookmarking", async () => {
      const postId = await createPost(userACookie, "Detail bookmark state");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.currentUserBookmarked).toBe(true);
    });

    it("reflects correct state for different users", async () => {
      const postId = await createPost(userACookie, "Multi-user bookmark");

      // User A bookmarks
      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      // User A sees bookmarked
      const resA = await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}`)
        .set("Cookie", userACookie)
        .expect(200);
      expect(resA.body.currentUserBookmarked).toBe(true);

      // User B sees not bookmarked
      const resB = await request(testApp.app.getHttpServer())
        .get(`/posts/${postId}`)
        .set("Cookie", userBCookie)
        .expect(200);
      expect(resB.body.currentUserBookmarked).toBe(false);
    });
  });

  // ============================================================
  // GET /users/:id/bookmarks
  // ============================================================
  describe("GET /users/:id/bookmarks", () => {
    it("returns empty list when user has no bookmarks", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/bookmarks`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.nextCursor).toBeNull();
    });

    it("returns bookmarked posts ordered by most recently saved", async () => {
      const postId1 = await createPost(userACookie, "First post");
      const postId2 = await createPost(userACookie, "Second post");
      const postId3 = await createPost(userACookie, "Third post");

      // Bookmark in order: 1, 3, 2
      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId1}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 50));

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId3}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      await new Promise((r) => setTimeout(r, 50));

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId2}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/bookmarks`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(3);
      // Most recently bookmarked first: 2, 3, 1
      expect(res.body.items[0].id).toBe(postId2);
      expect(res.body.items[1].id).toBe(postId3);
      expect(res.body.items[2].id).toBe(postId1);
    });

    it("supports pagination with cursor", async () => {
      // Create 5 posts and bookmark them
      const postIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const id = await createPost(userACookie, `Paginated post ${i}`);
        postIds.push(id);
        await new Promise((r) => setTimeout(r, 50));
        await request(testApp.app.getHttpServer())
          .post(`/posts/${id}/bookmark`)
          .set("Cookie", userACookie)
          .send({})
          .expect(200);
        await new Promise((r) => setTimeout(r, 50));
      }

      // First page with limit 2
      const page1 = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/bookmarks?limit=2`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.nextCursor).toBeTruthy();

      // Second page
      const page2 = await request(testApp.app.getHttpServer())
        .get(
          `/users/${userAId}/bookmarks?limit=2&cursor=${page1.body.nextCursor}`,
        )
        .set("Cookie", userACookie)
        .expect(200);

      expect(page2.body.items).toHaveLength(2);
      expect(page2.body.nextCursor).toBeTruthy();

      // Third page (last item)
      const page3 = await request(testApp.app.getHttpServer())
        .get(
          `/users/${userAId}/bookmarks?limit=2&cursor=${page2.body.nextCursor}`,
        )
        .set("Cookie", userACookie)
        .expect(200);

      expect(page3.body.items).toHaveLength(1);
      expect(page3.body.nextCursor).toBeNull();

      // Verify no duplicates across pages
      const allIds = [
        ...page1.body.items.map((p: { id: string }) => p.id),
        ...page2.body.items.map((p: { id: string }) => p.id),
        ...page3.body.items.map((p: { id: string }) => p.id),
      ];
      expect(new Set(allIds).size).toBe(5);
    });

    it("does not include unbookmarked posts", async () => {
      const postId1 = await createPost(userACookie, "Keep bookmark");
      const postId2 = await createPost(userACookie, "Remove bookmark");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId1}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId2}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      await request(testApp.app.getHttpServer())
        .delete(`/posts/${postId2}/bookmark`)
        .set("Cookie", userACookie)
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/bookmarks`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(postId1);
    });

    it("returns posts with correct bookmark state", async () => {
      const postId = await createPost(userACookie, "Bookmark state in list");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/bookmarks`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items[0].currentUserBookmarked).toBe(true);
    });

    it("only shows bookmarks for the requested user", async () => {
      const postId = await createPost(userACookie, "User A's bookmark");

      // User A bookmarks
      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      // User B's bookmark list should be empty
      const res = await request(testApp.app.getHttpServer())
        .get(`/users/${userBId}/bookmarks`)
        .set("Cookie", userBCookie)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/bookmarks`)
        .expect(401);
    });

    it("returns posts with full post data structure", async () => {
      const postId = await createPost(userACookie, "Full post structure");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/bookmarks`)
        .set("Cookie", userACookie)
        .expect(200);

      const post = res.body.items[0];
      expect(post.id).toBe(postId);
      expect(post.authorId).toBeTruthy();
      expect(post.author).toBeDefined();
      expect(post.author.id).toBeTruthy();
      expect(post.content).toBeDefined();
      expect(post.content.text).toBe("Full post structure");
      expect(post.createdAt).toBeDefined();
      expect(post.updatedAt).toBeDefined();
      expect(post.upvoteCount).toBeDefined();
      expect(post.downvoteCount).toBeDefined();
      expect(post.commentCount).toBeDefined();
      expect(post.currentUserReaction).toBeDefined();
      expect(post.currentUserSubscribed).toBeDefined();
      expect(post.currentUserBookmarked).toBe(true);
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe("edge cases", () => {
    it("can bookmark another user's post", async () => {
      const postId = await createPost(userBCookie, "User B's post");

      const res = await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      expect(res.body.postId).toBe(postId);
    });

    it("both users can bookmark the same post independently", async () => {
      const postId = await createPost(userACookie, "Shared bookmark");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userBCookie)
        .send({})
        .expect(200);

      // Both users should have it in their bookmarks
      const resA = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/bookmarks`)
        .set("Cookie", userACookie)
        .expect(200);

      const resB = await request(testApp.app.getHttpServer())
        .get(`/users/${userBId}/bookmarks`)
        .set("Cookie", userBCookie)
        .expect(200);

      expect(resA.body.items).toHaveLength(1);
      expect(resB.body.items).toHaveLength(1);
    });

    it("unbookmarking by one user does not affect other user's bookmark", async () => {
      const postId = await createPost(userACookie, "Independent bookmarks");

      // Both users bookmark
      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userBCookie)
        .send({})
        .expect(200);

      // User A unbookmarks
      await request(testApp.app.getHttpServer())
        .delete(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .expect(200);

      // User B should still have bookmark
      const resB = await request(testApp.app.getHttpServer())
        .get(`/users/${userBId}/bookmarks`)
        .set("Cookie", userBCookie)
        .expect(200);
      expect(resB.body.items).toHaveLength(1);

      // User A should not
      const resA = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/bookmarks`)
        .set("Cookie", userACookie)
        .expect(200);
      expect(resA.body.items).toHaveLength(0);
    });

    it("bookmark state is correct in user-specific post list", async () => {
      const postId = await createPost(userACookie, "User-specific list");

      await request(testApp.app.getHttpServer())
        .post(`/posts/${postId}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);

      const res = await request(testApp.app.getHttpServer())
        .get(`/users/${userAId}/posts`)
        .set("Cookie", userACookie)
        .expect(200);

      const post = res.body.items.find((p: { id: string }) => p.id === postId);
      expect(post.currentUserBookmarked).toBe(true);
    });
  });
});
