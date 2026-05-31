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

describe("GET /users/:id/posts integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let minioContainer: MinioContainerContext;
  let pool: Pool;

  let userACookie: string;
  let userBCookie: string;

  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    containers = await startPostgresContainer();
    minioContainer = await startMinioContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers, undefined, minioContainer);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());

    userACookie = await registerAndGetSessionCookie(
      server,
      `user-posts-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `user-posts-b-${Date.now()}@example.com`,
    );

    const userASession = await server
      .get("/api/auth/get-session")
      .set("Cookie", userACookie)
      .expect(200);
    const userBSession = await server
      .get("/api/auth/get-session")
      .set("Cookie", userBCookie)
      .expect(200);

    userAId = userASession.body.user.id as string;
    userBId = userBSession.body.user.id as string;
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
    await stopMinioContainer(minioContainer);
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE TABLE notifications, posts RESTART IDENTITY CASCADE",
    );
  });

  it("returns empty items and null nextCursor when the user has no posts", async () => {
    const res = await request(testApp.app.getHttpServer())
      .get(`/users/${userAId}/posts`)
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toEqual([]);
    expect(res.body.nextCursor).toBeNull();
  });

  it("returns only posts by the specified user", async () => {
    const server = request(testApp.app.getHttpServer());

    // User A creates a post
    await server
      .post("/posts")
      .set("Cookie", userACookie)
      .send({ content: { text: "Post by A" } })
      .expect(201);

    // User B creates a post
    await server
      .post("/posts")
      .set("Cookie", userBCookie)
      .send({ content: { text: "Post by B" } })
      .expect(201);

    const res = await server
      .get(`/users/${userAId}/posts`)
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].content.text).toBe("Post by A");
    expect(res.body.items[0].authorId).toBe(userAId);
  });

  it("returns posts ordered by newest first", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post("/posts")
      .set("Cookie", userACookie)
      .send({ content: { text: "Older post" } })
      .expect(201);

    await server
      .post("/posts")
      .set("Cookie", userACookie)
      .send({ content: { text: "Newer post" } })
      .expect(201);

    const res = await server
      .get(`/users/${userAId}/posts`)
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].content.text).toBe("Newer post");
    expect(res.body.items[1].content.text).toBe("Older post");
  });

  it("returns correct post shape with author and reaction counts", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post("/posts")
      .set("Cookie", userACookie)
      .send({ content: { text: "Shaped post" } })
      .expect(201);

    const res = await server
      .get(`/users/${userAId}/posts`)
      .set("Cookie", userACookie)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    const post = res.body.items[0];
    expect(post.id).toBeTruthy();
    expect(post.authorId).toBe(userAId);
    expect(post.content.text).toBe("Shaped post");
    expect(post.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(post.author).toBeDefined();
    expect(post.author.id).toBe(userAId);
    expect(post.upvoteCount).toBe(0);
    expect(post.downvoteCount).toBe(0);
    expect(post.commentCount).toBe(0);
  });

  it("allows viewing another user's posts", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post("/posts")
      .set("Cookie", userACookie)
      .send({ content: { text: "Post by A" } })
      .expect(201);

    // User B views User A's posts
    const res = await server
      .get(`/users/${userAId}/posts`)
      .set("Cookie", userBCookie)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].content.text).toBe("Post by A");
  });

  it("returns 401 when not authenticated", async () => {
    await request(testApp.app.getHttpServer())
      .get(`/users/${userAId}/posts`)
      .expect(401);
  });

  describe("pagination", () => {
    it("returns nextCursor when there are more posts than the limit", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create 3 posts
      for (let i = 1; i <= 3; i++) {
        await server
          .post("/posts")
          .set("Cookie", userACookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      const res = await server
        .get(`/users/${userAId}/posts?limit=2`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.nextCursor).not.toBeNull();
      expect(typeof res.body.nextCursor).toBe("string");
    });

    it("returns null nextCursor on the last page", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create 2 posts
      for (let i = 1; i <= 2; i++) {
        await server
          .post("/posts")
          .set("Cookie", userACookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      const res = await server
        .get(`/users/${userAId}/posts?limit=2`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.nextCursor).toBeNull();
    });

    it("cursor fetches the next page without overlap or gap", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create 5 posts (newest last since inserts are sequential)
      const texts = ["Post 1", "Post 2", "Post 3", "Post 4", "Post 5"];
      for (const text of texts) {
        await server
          .post("/posts")
          .set("Cookie", userACookie)
          .send({ content: { text } })
          .expect(201);
      }

      // First page: limit=3 → should give 3 newest (Post 5, 4, 3)
      const page1 = await server
        .get(`/users/${userAId}/posts?limit=3`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(page1.body.items).toHaveLength(3);
      expect(page1.body.nextCursor).not.toBeNull();
      const page1Texts = (
        page1.body.items as { content: { text: string } }[]
      ).map((p) => p.content.text);
      expect(page1Texts).toEqual(["Post 5", "Post 4", "Post 3"]);

      // Second page using cursor → should give remaining 2 (Post 2, 1)
      const page2 = await server
        .get(
          `/users/${userAId}/posts?limit=3&cursor=${page1.body.nextCursor}`,
        )
        .set("Cookie", userACookie)
        .expect(200);

      expect(page2.body.items).toHaveLength(2);
      expect(page2.body.nextCursor).toBeNull();
      const page2Texts = (
        page2.body.items as { content: { text: string } }[]
      ).map((p) => p.content.text);
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

      // Create 21 posts
      for (let i = 1; i <= 21; i++) {
        await server
          .post("/posts")
          .set("Cookie", userACookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      const res = await server
        .get(`/users/${userAId}/posts`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(20);
      expect(res.body.nextCursor).not.toBeNull();
    });

    it("paginates through multiple pages collecting all posts", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create 7 posts
      for (let i = 1; i <= 7; i++) {
        await server
          .post("/posts")
          .set("Cookie", userACookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      const allItems: { id: string; content: { text: string } }[] = [];
      let cursor: string | null = null;

      // Paginate with limit=3
      do {
        const url = cursor
          ? `/users/${userAId}/posts?limit=3&cursor=${cursor}`
          : `/users/${userAId}/posts?limit=3`;

        const res = await server
          .get(url)
          .set("Cookie", userACookie)
          .expect(200);

        allItems.push(
          ...(res.body.items as { id: string; content: { text: string } }[]),
        );
        cursor = res.body.nextCursor as string | null;
      } while (cursor);

      // Should have all 7 posts
      expect(allItems).toHaveLength(7);

      // All IDs should be unique
      const ids = allItems.map((p) => p.id);
      expect(new Set(ids).size).toBe(7);

      // Should be in descending order (Post 7 first, Post 1 last)
      const texts = allItems.map((p) => p.content.text);
      expect(texts).toEqual([
        "Post 7",
        "Post 6",
        "Post 5",
        "Post 4",
        "Post 3",
        "Post 2",
        "Post 1",
      ]);
    });
  });
});
