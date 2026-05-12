import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";

import { closeTestApp, createTestApp } from "../helpers/app.setup";
import { runBetterAuthMigrations } from "../helpers/database.setup";
import { registerAndGetSessionCookie } from "../helpers/auth.helper";
import {
  startPostgresContainer,
  stopPostgresContainer,
  startMinioContainer,
  stopMinioContainer,
  type PostgresContainerContext,
  type MinioContainerContext,
} from "../helpers/testcontainers.setup";

describe("GET /posts/following integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let minioContainer: MinioContainerContext;
  let pool: Pool;

  let userACookie: string;
  let userBCookie: string;
  let userCCookie: string;

  let userAId: string;
  let userBId: string;
  let userCId: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    minioContainer = await startMinioContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers, undefined, minioContainer);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());

    userACookie = await registerAndGetSessionCookie(
      server,
      `following-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `following-b-${Date.now()}@example.com`,
    );
    userCCookie = await registerAndGetSessionCookie(
      server,
      `following-c-${Date.now()}@example.com`,
    );

    const userASession = await server
      .get("/api/auth/get-session")
      .set("Cookie", userACookie)
      .expect(200);
    const userBSession = await server
      .get("/api/auth/get-session")
      .set("Cookie", userBCookie)
      .expect(200);
    const userCSession = await server
      .get("/api/auth/get-session")
      .set("Cookie", userCCookie)
      .expect(200);

    userAId = userASession.body.user.id as string;
    userBId = userBSession.body.user.id as string;
    userCId = userCSession.body.user.id as string;
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
    await stopMinioContainer(minioContainer);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE posts RESTART IDENTITY CASCADE");
    await pool.query("TRUNCATE TABLE user_follows RESTART IDENTITY CASCADE");
  });

  it("returns empty items and null nextCursor when the user follows nobody", async () => {
    const res = await request(testApp.app.getHttpServer())
      .get("/posts/following")
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toEqual([]);
    expect(res.body.nextCursor).toBeNull();
  });

  it("returns empty items when followed users have no posts", async () => {
    const server = request(testApp.app.getHttpServer());

    // A follows B, but B has no posts
    await server
      .post(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);

    const res = await server
      .get("/posts/following")
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toEqual([]);
    expect(res.body.nextCursor).toBeNull();
  });

  it("returns posts only from followed users, not from unfollowed users", async () => {
    const server = request(testApp.app.getHttpServer());

    // A follows B but not C
    await server
      .post(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);

    // B creates a post
    await server
      .post("/posts")
      .set("Cookie", userBCookie)
      .send({ content: { text: "Post by B" } })
      .expect(201);

    // C creates a post (A does not follow C)
    await server
      .post("/posts")
      .set("Cookie", userCCookie)
      .send({ content: { text: "Post by C" } })
      .expect(201);

    const res = await server
      .get("/posts/following")
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].content.text).toBe("Post by B");
    expect(res.body.items[0].authorId).toBe(userBId);
  });

  it("returns posts from multiple followed users ordered by newest first", async () => {
    const server = request(testApp.app.getHttpServer());

    // A follows B and C
    await server
      .post(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);
    await server
      .post(`/users/${userCId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);

    // B and C each create a post
    await server
      .post("/posts")
      .set("Cookie", userBCookie)
      .send({ content: { text: "Older post by B" } })
      .expect(201);
    await server
      .post("/posts")
      .set("Cookie", userCCookie)
      .send({ content: { text: "Newer post by C" } })
      .expect(201);

    const res = await server
      .get("/posts/following")
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toHaveLength(2);
    // Newest first
    expect(res.body.items[0].content.text).toBe("Newer post by C");
    expect(res.body.items[1].content.text).toBe("Older post by B");
  });

  it("does not include the current user's own posts", async () => {
    const server = request(testApp.app.getHttpServer());

    // A follows B
    await server
      .post(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);

    // A creates their own post
    await server
      .post("/posts")
      .set("Cookie", userACookie)
      .send({ content: { text: "Post by A (self)" } })
      .expect(201);

    // B creates a post
    await server
      .post("/posts")
      .set("Cookie", userBCookie)
      .send({ content: { text: "Post by B" } })
      .expect(201);

    const res = await server
      .get("/posts/following")
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].content.text).toBe("Post by B");
  });

  it("returns correct post shape with author and reaction counts", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);

    await server
      .post("/posts")
      .set("Cookie", userBCookie)
      .send({ content: { text: "Shaped post" } })
      .expect(201);

    const res = await server
      .get("/posts/following")
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    const post = res.body.items[0];
    expect(post.id).toBeTruthy();
    expect(post.authorId).toBe(userBId);
    expect(post.content.text).toBe("Shaped post");
    expect(post.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(post.author).toBeDefined();
    expect(post.author.id).toBe(userBId);
    expect(post.upvoteCount).toBe(0);
    expect(post.downvoteCount).toBe(0);
    expect(post.commentCount).toBe(0);
  });

  it("stops returning posts after unfollowing a user", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);

    await server
      .post("/posts")
      .set("Cookie", userBCookie)
      .send({ content: { text: "Post by B" } })
      .expect(201);

    // Verify it appears before unfollowing
    const before = await server
      .get("/posts/following")
      .set("Cookie", userACookie)
      .expect(200);
    expect(before.body.items).toHaveLength(1);

    // Unfollow B
    await server
      .delete(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(200);

    const after = await server
      .get("/posts/following")
      .set("Cookie", userACookie)
      .expect(200);
    expect(after.body.items).toEqual([]);
  });

  it("returns 401 when not authenticated", async () => {
    await request(testApp.app.getHttpServer())
      .get("/posts/following")
      .expect(401);
  });

  it("includes userAId posts in B's following feed when B follows A", async () => {
    const server = request(testApp.app.getHttpServer());

    // B follows A
    await server
      .post(`/users/${userAId}/follow`)
      .set("Cookie", userBCookie)
      .expect(201);

    await server
      .post("/posts")
      .set("Cookie", userACookie)
      .send({ content: { text: "Post by A for B's feed" } })
      .expect(201);

    const res = await server
      .get("/posts/following")
      .set("Cookie", userBCookie)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].content.text).toBe("Post by A for B's feed");
  });

  describe("pagination", () => {
    it("returns nextCursor when there are more posts than the limit", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post(`/users/${userBId}/follow`)
        .set("Cookie", userACookie)
        .expect(201);

      // Create 3 posts
      for (let i = 1; i <= 3; i++) {
        await server
          .post("/posts")
          .set("Cookie", userBCookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      const res = await server
        .get("/posts/following?limit=2")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.nextCursor).not.toBeNull();
      expect(typeof res.body.nextCursor).toBe("string");
    });

    it("returns null nextCursor on the last page", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post(`/users/${userBId}/follow`)
        .set("Cookie", userACookie)
        .expect(201);

      // Create 2 posts
      for (let i = 1; i <= 2; i++) {
        await server
          .post("/posts")
          .set("Cookie", userBCookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      const res = await server
        .get("/posts/following?limit=2")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.nextCursor).toBeNull();
    });

    it("cursor fetches the next page without overlap or gap", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post(`/users/${userBId}/follow`)
        .set("Cookie", userACookie)
        .expect(201);

      // Create 5 posts (newest last since inserts are sequential)
      const texts = ["Post 1", "Post 2", "Post 3", "Post 4", "Post 5"];
      for (const text of texts) {
        await server
          .post("/posts")
          .set("Cookie", userBCookie)
          .send({ content: { text } })
          .expect(201);
      }

      // First page: limit=3 → should give 3 newest (Post 5, 4, 3)
      const page1 = await server
        .get("/posts/following?limit=3")
        .set("Cookie", userACookie)
        .expect(200);

      expect(page1.body.items).toHaveLength(3);
      expect(page1.body.nextCursor).not.toBeNull();
      const page1Texts = (page1.body.items as { content: { text: string } }[]).map(
        (p) => p.content.text,
      );
      expect(page1Texts).toEqual(["Post 5", "Post 4", "Post 3"]);

      // Second page using cursor → should give remaining 2 (Post 2, 1)
      const page2 = await server
        .get(`/posts/following?limit=3&cursor=${page1.body.nextCursor}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(page2.body.items).toHaveLength(2);
      expect(page2.body.nextCursor).toBeNull();
      const page2Texts = (page2.body.items as { content: { text: string } }[]).map(
        (p) => p.content.text,
      );
      expect(page2Texts).toEqual(["Post 2", "Post 1"]);

      // No duplicate IDs across pages
      const allIds = [
        ...(page1.body.items as { id: string }[]).map((p) => p.id),
        ...(page2.body.items as { id: string }[]).map((p) => p.id),
      ];
      expect(new Set(allIds).size).toBe(5);
    });

    it("default limit is 20", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post(`/users/${userBId}/follow`)
        .set("Cookie", userACookie)
        .expect(201);

      // Create 21 posts
      for (let i = 1; i <= 21; i++) {
        await server
          .post("/posts")
          .set("Cookie", userBCookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      const res = await server
        .get("/posts/following")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(20);
      expect(res.body.nextCursor).not.toBeNull();
    });
  });
});
