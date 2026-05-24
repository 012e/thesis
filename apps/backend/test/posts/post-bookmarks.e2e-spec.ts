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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Post bookmarks integration", () => {
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
      `bookmark-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `bookmark-b-${Date.now()}@example.com`,
    );
    userCCookie = await registerAndGetSessionCookie(
      server,
      `bookmark-c-${Date.now()}@example.com`,
    );

    const [aSession, bSession, cSession] = await Promise.all([
      server.get("/api/auth/get-session").set("Cookie", userACookie).expect(200),
      server.get("/api/auth/get-session").set("Cookie", userBCookie).expect(200),
      server.get("/api/auth/get-session").set("Cookie", userCCookie).expect(200),
    ]);

    userAId = aSession.body.user.id as string;
    userBId = bSession.body.user.id as string;
    userCId = cSession.body.user.id as string;
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
    await stopMinioContainer(minioContainer);
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE TABLE notifications, post_bookmarks, post_reactions, comments, post_subscriptions, posts, user_follows RESTART IDENTITY CASCADE",
    );
  });

  it("requires authentication for bookmark endpoints", async () => {
    const server = request(testApp.app.getHttpServer());
    const created = await server
      .post("/posts")
      .set("Cookie", userACookie)
      .send({ content: { text: "Auth protected bookmark target" } })
      .expect(201);

    await server.post(`/posts/${created.body.id}/bookmark`).send({}).expect(401);
    await server.delete(`/posts/${created.body.id}/bookmark`).expect(401);
    await server.get(`/users/${userAId}/bookmarks`).expect(401);
  });

  it("returns 404 when bookmarking or unbookmarking a non-existent post", async () => {
    const server = request(testApp.app.getHttpServer());
    const missingId = "00000000-0000-0000-0000-000000000000";

    await server
      .post(`/posts/${missingId}/bookmark`)
      .set("Cookie", userACookie)
      .send({})
      .expect(404);

    await server
      .delete(`/posts/${missingId}/bookmark`)
      .set("Cookie", userACookie)
      .expect(404);
  });

  it("bookmarks and unbookmarks with idempotent behavior", async () => {
    const server = request(testApp.app.getHttpServer());
    const created = await server
      .post("/posts")
      .set("Cookie", userBCookie)
      .send({ content: { text: "Bookmark me" } })
      .expect(201);

    const firstSave = await server
      .post(`/posts/${created.body.id}/bookmark`)
      .set("Cookie", userACookie)
      .send({})
      .expect(200);

    expect(firstSave.body.currentUserBookmarked).toBe(true);
    expect(firstSave.body.currentUserBookmark).toEqual(
      expect.objectContaining({
        postId: created.body.id,
        userId: userAId,
      }),
    );

    const secondSave = await server
      .post(`/posts/${created.body.id}/bookmark`)
      .set("Cookie", userACookie)
      .send({})
      .expect(200);

    expect(secondSave.body.currentUserBookmarked).toBe(true);
    expect(secondSave.body.currentUserBookmark.postId).toBe(created.body.id);
    expect(secondSave.body.currentUserBookmark.userId).toBe(userAId);

    const firstRemove = await server
      .delete(`/posts/${created.body.id}/bookmark`)
      .set("Cookie", userACookie)
      .expect(200);
    expect(firstRemove.body).toEqual({
      currentUserBookmarked: false,
      currentUserBookmark: null,
    });

    const secondRemove = await server
      .delete(`/posts/${created.body.id}/bookmark`)
      .set("Cookie", userACookie)
      .expect(200);
    expect(secondRemove.body).toEqual({
      currentUserBookmarked: false,
      currentUserBookmark: null,
    });
  });

  it("lists only the requesting user's bookmarks in newest-saved order", async () => {
    const server = request(testApp.app.getHttpServer());
    const [post1, post2, post3] = await Promise.all([
      server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "First post" } })
        .expect(201),
      server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "Second post" } })
        .expect(201),
      server
        .post("/posts")
        .set("Cookie", userCCookie)
        .send({ content: { text: "Third post" } })
        .expect(201),
    ]);

    await server
      .post(`/posts/${post1.body.id}/bookmark`)
      .set("Cookie", userACookie)
      .send({})
      .expect(200);
    await sleep(5);
    await server
      .post(`/posts/${post2.body.id}/bookmark`)
      .set("Cookie", userACookie)
      .send({})
      .expect(200);
    await sleep(5);
    await server
      .post(`/posts/${post3.body.id}/bookmark`)
      .set("Cookie", userACookie)
      .send({})
      .expect(200);

    // Other user bookmark should never appear in A's list.
    await server
      .post(`/posts/${post1.body.id}/bookmark`)
      .set("Cookie", userBCookie)
      .send({})
      .expect(200);

    const list = await server
      .get(`/users/${userAId}/bookmarks`)
      .set("Cookie", userACookie)
      .expect(200);

    expect(list.body.items).toHaveLength(3);
    expect(list.body.items.map((item: { id: string }) => item.id)).toEqual([
      post3.body.id,
      post2.body.id,
      post1.body.id,
    ]);
    expect(list.body.nextCursor).toBeNull();
    expect(list.body.items[0].currentUserBookmarked).toBe(true);
    expect(list.body.items[0].currentUserBookmark.userId).toBe(userAId);
  });

  it("returns 403 when requesting someone else's bookmarks", async () => {
    const server = request(testApp.app.getHttpServer());
    await server
      .get(`/users/${userAId}/bookmarks`)
      .set("Cookie", userBCookie)
      .expect(403);
  });

  it("supports bookmarks cursor pagination without overlap", async () => {
    const server = request(testApp.app.getHttpServer());
    const created: Array<{ id: string }> = [];

    for (let i = 1; i <= 5; i++) {
      const post = await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: `Pagination post ${i}` } })
        .expect(201);
      created.push({ id: post.body.id as string });
    }

    for (const post of created) {
      await server
        .post(`/posts/${post.id}/bookmark`)
        .set("Cookie", userACookie)
        .send({})
        .expect(200);
      await sleep(5);
    }

    const page1 = await server
      .get(`/users/${userAId}/bookmarks?limit=3`)
      .set("Cookie", userACookie)
      .expect(200);

    expect(page1.body.items).toHaveLength(3);
    expect(page1.body.nextCursor).not.toBeNull();

    const page2 = await server
      .get(`/users/${userAId}/bookmarks?limit=3&cursor=${page1.body.nextCursor}`)
      .set("Cookie", userACookie)
      .expect(200);

    expect(page2.body.items).toHaveLength(2);
    expect(page2.body.nextCursor).toBeNull();

    const allIds = [
      ...(page1.body.items as { id: string }[]).map((item) => item.id),
      ...(page2.body.items as { id: string }[]).map((item) => item.id),
    ];
    expect(new Set(allIds).size).toBe(5);
  });

  it("includes bookmark state consistently across list/detail/search/following/recommendations/bookmarks endpoints", async () => {
    const server = request(testApp.app.getHttpServer());

    await server
      .post(`/users/${userBId}/follow`)
      .set("Cookie", userACookie)
      .expect(201);

    const target = await server
      .post("/posts")
      .set("Cookie", userBCookie)
      .send({ content: { text: "Consistency bookmark target uniquekeyword" } })
      .expect(201);

    await server
      .post(`/posts/${target.body.id}/bookmark`)
      .set("Cookie", userACookie)
      .send({})
      .expect(200);

    const [
      listPosts,
      detail,
      listUserPosts,
      following,
      recommendations,
      search,
      bookmarks,
    ] = await Promise.all([
      server.get("/posts").set("Cookie", userACookie).expect(200),
      server.get(`/posts/${target.body.id}`).set("Cookie", userACookie).expect(200),
      server.get(`/users/${userBId}/posts`).set("Cookie", userACookie).expect(200),
      server.get("/posts/following").set("Cookie", userACookie).expect(200),
      server.get("/recommendations").set("Cookie", userACookie).expect(200),
      server
        .get("/posts/search?q=uniquekeyword")
        .set("Cookie", userACookie)
        .expect(200),
      server.get(`/users/${userAId}/bookmarks`).set("Cookie", userACookie).expect(200),
    ]);

    const pullPost = (items: Array<{ id: string }>) =>
      items.find((item) => item.id === target.body.id) as
        | {
            currentUserBookmarked: boolean;
            currentUserBookmark: { postId: string; userId: string } | null;
          }
        | undefined;

    const candidates = [
      pullPost(listPosts.body),
      detail.body as {
        currentUserBookmarked: boolean;
        currentUserBookmark: { postId: string; userId: string } | null;
      },
      pullPost(listUserPosts.body),
      pullPost(following.body.items),
      pullPost(recommendations.body.items),
      pullPost(search.body),
      pullPost(bookmarks.body.items),
    ];

    for (const post of candidates) {
      expect(post).toBeDefined();
      expect(post?.currentUserBookmarked).toBe(true);
      expect(post?.currentUserBookmark).toEqual(
        expect.objectContaining({
          postId: target.body.id,
          userId: userAId,
        }),
      );
    }
  });
});
