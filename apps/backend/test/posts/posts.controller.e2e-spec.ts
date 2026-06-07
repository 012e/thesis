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

describe("PostsController integration", () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: PostgresContainerContext;
  let minioContainer: MinioContainerContext;
  let pool: Pool;

  // Two distinct users for authorization tests
  let userACookie: string;
  let userBCookie: string;

  const expectPostDtoShape = (post: Record<string, unknown>) => {
    expect(post.id).toBeTruthy();
    expect(post.authorId).toBeTruthy();
    expect(post.author).toBeDefined();
    expect(post.content).toBeDefined();
    expect(post.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(post.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof post.upvoteCount).toBe("number");
    expect(typeof post.downvoteCount).toBe("number");
    expect(typeof post.commentCount).toBe("number");
    expect(typeof post.currentUserUpvoted).toBe("boolean");
    expect(typeof post.currentUserDownvoted).toBe("boolean");
    expect(typeof post.currentUserSubscribed).toBe("boolean");
    expect(typeof post.currentUserBookmarked).toBe("boolean");
    expect(Array.isArray(post.tags)).toBe(true);
  };

  beforeAll(async () => {
    containers = await startPostgresContainer();
    minioContainer = await startMinioContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers, undefined, minioContainer);
    pool = new Pool({ connectionString: containers.databaseUrl });

    const server = request(testApp.app.getHttpServer());
    userACookie = await registerAndGetSessionCookie(
      server,
      `user-a-${Date.now()}@example.com`,
    );
    userBCookie = await registerAndGetSessionCookie(
      server,
      `user-b-${Date.now()}@example.com`,
    );
  }, 120000);

  afterAll(async () => {
    await pool.end();
    await closeTestApp(testApp);
    await stopPostgresContainer(containers);
    await stopMinioContainer(minioContainer);
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE TABLE notifications, recommendation_items, recommendation_batches, user_recommendation_profiles, posts RESTART IDENTITY CASCADE",
    );
  });

  describe("GET /posts", () => {
    it("returns an empty array when there are no posts", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get("/posts")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it("returns all posts ordered by creation date descending", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "First post" } })
        .expect(201);

      await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Second post" } })
        .expect(201);

      const res = await server
        .get("/posts")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].content.text).toBe("Second post");
      expect(res.body[1].content.text).toBe("First post");
    });

    it("returns posts from all users", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Post by A" } })
        .expect(201);

      await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "Post by B" } })
        .expect(201);

      const res = await server
        .get("/posts")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer()).get("/posts").expect(401);
    });
  });

  describe("POST /posts", () => {
    it("creates a text post and returns 201 with the new post", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Hello world" } })
        .expect(201);

      expect(res.body.id).toBeTruthy();
      expect(res.body.content.text).toBe("Hello world");
      expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(res.body.author).toBeDefined();
      expect(res.body.author.id).toBeTruthy();
      expect(res.body.author.email).toBeTruthy();
      expect(res.body.upvoteCount).toBe(0);
      expect(res.body.downvoteCount).toBe(0);
      expect(res.body.currentUserReaction).toBeNull();
      expect(res.body.currentUserUpvoted).toBe(false);
      expect(res.body.currentUserDownvoted).toBe(false);
      expect(res.body.currentUserSubscribed).toBe(true);
    });

    it("creates a poll post", async () => {
      const poll = {
        question: "Favourite language?",
        options: [
          { id: "ts", label: "TypeScript" },
          { id: "py", label: "Python" },
        ],
        allowsMultipleSelections: false,
      };

      const res = await request(testApp.app.getHttpServer())
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { poll } })
        .expect(201);

      expect(res.body.content.poll.question).toBe("Favourite language?");
      expect(res.body.content.poll.options).toHaveLength(2);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .post("/posts")
        .send({ content: { text: "Unauthorized" } })
        .expect(401);
    });

    it("returns 422 or 400 for invalid post content", async () => {
      const res = await request(testApp.app.getHttpServer())
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: {} }); // no text, poll, or visualization

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe("GET /posts/:id", () => {
    it("returns a post by ID", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Find me by ID" } })
        .expect(201);

      const res = await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(res.body.content.text).toBe("Find me by ID");
      expect(res.body.author).toBeDefined();
      expect(res.body.author.id).toBe(created.body.author.id);
      expect(res.body.upvoteCount).toBe(0);
      expect(res.body.downvoteCount).toBe(0);
      expect(res.body.currentUserReaction).toBeNull();
      expect(res.body.currentUserUpvoted).toBe(false);
      expect(res.body.currentUserDownvoted).toBe(false);
    });

    it("returns the current user's upvote and downvote status", async () => {
      const server = request(testApp.app.getHttpServer());

      const upvoted = await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "Post user A upvotes" } })
        .expect(201);
      const downvoted = await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "Post user A downvotes" } })
        .expect(201);

      await server
        .put(`/posts/${upvoted.body.id}/reaction`)
        .set("Cookie", userACookie)
        .send({ type: "upvote" })
        .expect(200);
      await server
        .put(`/posts/${downvoted.body.id}/reaction`)
        .set("Cookie", userACookie)
        .send({ type: "downvote" })
        .expect(200);

      const upvotedForA = await server
        .get(`/posts/${upvoted.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);
      const downvotedForA = await server
        .get(`/posts/${downvoted.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);
      const upvotedForB = await server
        .get(`/posts/${upvoted.body.id}`)
        .set("Cookie", userBCookie)
        .expect(200);

      expect(upvotedForA.body).toMatchObject({
        currentUserReaction: "upvote",
        currentUserUpvoted: true,
        currentUserDownvoted: false,
      });
      expect(downvotedForA.body).toMatchObject({
        currentUserReaction: "downvote",
        currentUserUpvoted: false,
        currentUserDownvoted: true,
      });
      expect(upvotedForB.body).toMatchObject({
        currentUserReaction: null,
        currentUserUpvoted: false,
        currentUserDownvoted: false,
      });
    });

    it("returns 404 for a non-existent post", async () => {
      await request(testApp.app.getHttpServer())
        .get("/posts/00000000-0000-0000-0000-000000000000")
        .set("Cookie", userACookie)
        .expect(404);
    });
  });

  describe("PUT /posts/:id", () => {
    it("updates an owned post", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Original text" } })
        .expect(201);

      const res = await server
        .put(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .send({ content: { text: "Updated text" } })
        .expect(200);

      expect(res.body.content.text).toBe("Updated text");
    });

    it("returns 403 when another user tries to update the post", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "User A post" } })
        .expect(201);

      await server
        .put(`/posts/${created.body.id}`)
        .set("Cookie", userBCookie)
        .send({ content: { text: "Hacked by B" } })
        .expect(403);
    });

    it("returns 404 for a non-existent post", async () => {
      await request(testApp.app.getHttpServer())
        .put("/posts/00000000-0000-0000-0000-000000000000")
        .set("Cookie", userACookie)
        .send({ content: { text: "Ghost update" } })
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Auth check" } })
        .expect(201);

      await server
        .put(`/posts/${created.body.id}`)
        .send({ content: { text: "No auth" } })
        .expect(401);
    });
  });

  describe("DELETE /posts/:id", () => {
    it("deletes an owned post and makes it unfetchable", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Delete me" } })
        .expect(201);

      await server
        .delete(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 403 when another user tries to delete the post", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "User A post to keep" } })
        .expect(201);

      await server
        .delete(`/posts/${created.body.id}`)
        .set("Cookie", userBCookie)
        .expect(403);

      // Post should still exist
      await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);
    });

    it("returns 404 for a non-existent post", async () => {
      await request(testApp.app.getHttpServer())
        .delete("/posts/00000000-0000-0000-0000-000000000000")
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("returns 401 when not authenticated", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Protected post" } })
        .expect(201);

      await server.delete(`/posts/${created.body.id}`).expect(401);
    });
  });

  describe("post subscriptions", () => {
    it("lets a non-owner subscribe and unsubscribe", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Subscription target" } })
        .expect(201);

      const initialFetch = await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userBCookie)
        .expect(200);
      expect(initialFetch.body.currentUserSubscribed).toBe(false);

      const subscribed = await server
        .post(`/posts/${created.body.id}/subscribe`)
        .set("Cookie", userBCookie)
        .send({})
        .expect(200);
      expect(subscribed.body.postId).toBe(created.body.id);

      const afterSubscribe = await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userBCookie)
        .expect(200);
      expect(afterSubscribe.body.currentUserSubscribed).toBe(true);

      await server
        .delete(`/posts/${created.body.id}/subscribe`)
        .set("Cookie", userBCookie)
        .expect(200);

      const afterUnsubscribe = await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userBCookie)
        .expect(200);
      expect(afterUnsubscribe.body.currentUserSubscribed).toBe(false);
    });

    it("lets the post owner unsubscribe", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Owner subscription" } })
        .expect(201);

      await server
        .delete(`/posts/${created.body.id}/subscribe`)
        .set("Cookie", userACookie)
        .expect(200);

      const fetched = await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);
      expect(fetched.body.currentUserSubscribed).toBe(false);
    });

    it("notifies subscribers when a post is updated", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Before update" } })
        .expect(201);

      await server
        .post(`/posts/${created.body.id}/subscribe`)
        .set("Cookie", userBCookie)
        .send({})
        .expect(200);

      await server
        .put(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .send({ content: { text: "After update" } })
        .expect(200);

      const notifications = await server
        .get("/notifications")
        .set("Cookie", userBCookie)
        .expect(200);

      expect(notifications.body.notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "post_update",
            payload: expect.objectContaining({ postId: created.body.id }),
          }),
        ]),
      );
    });
  });

  describe("GET /recommendations", () => {
    it("returns posts ordered by recency for cold-start users", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create posts as userB so they show up for userA (own posts are excluded)
      const post1 = await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "Oldest post" } })
        .expect(201);

      // Small delay to ensure different createdAt
      await new Promise((r) => setTimeout(r, 50));

      const post2 = await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "Middle post" } })
        .expect(201);

      await new Promise((r) => setTimeout(r, 50));

      const post3 = await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "Newest post" } })
        .expect(201);

      const res = await server
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(3);
      // Recency fallback: newest first
      expect(res.body.items[0].id).toBe(post3.body.id);
      expect(res.body.items[1].id).toBe(post2.body.id);
      expect(res.body.items[2].id).toBe(post1.body.id);
      expect(res.body.nextCursor).toBeNull();
    });

    it("returns empty items array when no posts exist", async () => {
      const res = await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.nextCursor).toBeNull();
    });

    it("respects the limit query parameter", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create 5 posts as userB
      for (let i = 0; i < 5; i++) {
        await server
          .post("/posts")
          .set("Cookie", userBCookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      const res = await server
        .get("/recommendations?limit=3")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(3);
      expect(res.body.nextCursor).not.toBeNull();
    });

    it("paginates correctly using cursor", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create 4 posts as userB with small delays for ordering
      const createdPosts: Array<{ id: string }> = [];
      for (let i = 0; i < 4; i++) {
        const post = await server
          .post("/posts")
          .set("Cookie", userBCookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
        createdPosts.push(post.body);
        await new Promise((r) => setTimeout(r, 50));
      }

      // First page
      const page1 = await server
        .get("/recommendations?limit=2")
        .set("Cookie", userACookie)
        .expect(200);

      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.nextCursor).toBeTruthy();

      // Second page using cursor
      const page2 = await server
        .get(`/recommendations?limit=2&cursor=${page1.body.nextCursor}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(page2.body.items).toHaveLength(2);
      expect(page2.body.nextCursor).toBeNull();

      // All 4 posts should appear across both pages with no duplicates
      const allIds = [
        ...page1.body.items.map((i: { id: string }) => i.id),
        ...page2.body.items.map((i: { id: string }) => i.id),
      ];
      expect(new Set(allIds).size).toBe(4);
    });

    it("defaults to limit 20", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create 25 posts as userB
      for (let i = 0; i < 25; i++) {
        await server
          .post("/posts")
          .set("Cookie", userBCookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      const res = await server
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeLessThanOrEqual(20);
      for (const post of res.body.items as Record<string, unknown>[]) {
        expectPostDtoShape(post);
      }
    });

    it("excludes own posts from recommendations", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create a post as userA (should be excluded)
      await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "My own post" } })
        .expect(201);

      // Create a post as userB (should be included)
      const otherPost = await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "Other's post" } })
        .expect(201);

      const res = await server
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(otherPost.body.id);
    });

    it("returns 401 when not authenticated", async () => {
      await request(testApp.app.getHttpServer())
        .get("/recommendations")
        .expect(401);
    });

    it("handles invalid cursor gracefully by returning all results", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({ content: { text: "Test post" } })
        .expect(201);

      const res = await server
        .get("/recommendations?cursor=invalid-cursor-value")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
    });

    it("enforces max limit of 100", async () => {
      const server = request(testApp.app.getHttpServer());

      // Create 10 posts as userB
      for (let i = 0; i < 10; i++) {
        await server
          .post("/posts")
          .set("Cookie", userBCookie)
          .send({ content: { text: `Post ${i}` } })
          .expect(201);
      }

      // Request with limit > 100 should fail validation
      const res = await server
        .get("/recommendations?limit=101")
        .set("Cookie", userACookie);

      // Should either reject or clamp to 100
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Posts with Images Integration", () => {
    it("should create a post with images successfully", async () => {
      const server = request(testApp.app.getHttpServer());

      const postContent = {
        text: "Check out these images!",
        images: [
          {
            url: `${minioContainer.publicUrl}/test-bucket/image1.webp`,
            key: "images/user-123/image1.webp",
            width: 1200,
            height: 800,
          },
          {
            url: `${minioContainer.publicUrl}/test-bucket/image2.webp`,
            key: "images/user-123/image2.webp",
            width: 800,
            height: 600,
          },
        ],
      };

      const res = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: postContent })
        .expect(201);

      expect(res.body.id).toBeTruthy();
      expect(res.body.content.text).toBe("Check out these images!");
      expect(res.body.content.images).toHaveLength(2);
      expect(res.body.content.images[0].key).toBe(
        "images/user-123/image1.webp",
      );
      expect(res.body.content.images[0].width).toBe(1200);
      expect(res.body.content.images[0].height).toBe(800);
    });

    it("should retrieve a post with images", async () => {
      const server = request(testApp.app.getHttpServer());

      const postContent = {
        text: "Post with image",
        images: [
          {
            url: `${minioContainer.publicUrl}/test-bucket/test.webp`,
            key: "images/test.webp",
            width: 1000,
            height: 750,
          },
        ],
      };

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: postContent })
        .expect(201);

      const res = await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.content.images).toHaveLength(1);
      expect(res.body.content.images[0].key).toBe("images/test.webp");
    });

    it("should update a post and preserve images", async () => {
      const server = request(testApp.app.getHttpServer());

      const originalContent = {
        text: "Original text",
        images: [
          {
            url: `${minioContainer.publicUrl}/test-bucket/original.webp`,
            key: "images/original.webp",
            width: 800,
            height: 600,
          },
        ],
      };

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: originalContent })
        .expect(201);

      const updatedContent = {
        text: "Updated text",
        images: originalContent.images,
      };

      const res = await server
        .put(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .send({ content: updatedContent })
        .expect(200);

      expect(res.body.content.text).toBe("Updated text");
      expect(res.body.content.images).toHaveLength(1);
      expect(res.body.content.images[0].key).toBe("images/original.webp");
    });

    it("should delete post with images", async () => {
      const server = request(testApp.app.getHttpServer());

      const postContent = {
        text: "Post to be deleted",
        images: [
          {
            url: `${minioContainer.publicUrl}/test-bucket/delete1.webp`,
            key: "images/delete1.webp",
            width: 800,
            height: 600,
          },
        ],
      };

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: postContent })
        .expect(201);

      await server
        .delete(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);

      // Post should be gone
      await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(404);
    });

    it("should not delete post if authorization fails", async () => {
      const server = request(testApp.app.getHttpServer());

      const postContent = {
        text: "Protected post",
        images: [
          {
            url: `${minioContainer.publicUrl}/test-bucket/protected.webp`,
            key: "images/protected.webp",
            width: 800,
            height: 600,
          },
        ],
      };

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: postContent })
        .expect(201);

      // Try to delete with different user
      await server
        .delete(`/posts/${created.body.id}`)
        .set("Cookie", userBCookie)
        .expect(403);

      // Post should still exist
      await server
        .get(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .expect(200);
    });

    it("should handle posts with no images", async () => {
      const server = request(testApp.app.getHttpServer());

      const res = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "No images here" } })
        .expect(201);

      expect(res.body.content.text).toBe("No images here");
      expect(res.body.content.images).toBeUndefined();
    });

    it("should handle updating post to add images", async () => {
      const server = request(testApp.app.getHttpServer());

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: { text: "Initially no images" } })
        .expect(201);

      const updatedContent = {
        text: "Now with images",
        images: [
          {
            url: `${minioContainer.publicUrl}/test-bucket/new.webp`,
            key: "images/new.webp",
            width: 1000,
            height: 750,
          },
        ],
      };

      const res = await server
        .put(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .send({ content: updatedContent })
        .expect(200);

      expect(res.body.content.text).toBe("Now with images");
      expect(res.body.content.images).toHaveLength(1);
      expect(res.body.content.images[0].key).toBe("images/new.webp");
    });

    it("should handle updating post to remove images", async () => {
      const server = request(testApp.app.getHttpServer());

      const originalContent = {
        text: "With images",
        images: [
          {
            url: `${minioContainer.publicUrl}/test-bucket/remove.webp`,
            key: "images/remove.webp",
            width: 800,
            height: 600,
          },
        ],
      };

      const created = await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({ content: originalContent })
        .expect(201);

      const updatedContent = {
        text: "Images removed",
      };

      const res = await server
        .put(`/posts/${created.body.id}`)
        .set("Cookie", userACookie)
        .send({ content: updatedContent })
        .expect(200);

      expect(res.body.content.text).toBe("Images removed");
      expect(res.body.content.images).toBeUndefined();
    });

    it("should include images in feed posts", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post("/posts")
        .set("Cookie", userACookie)
        .send({
          content: {
            text: "Feed post with image",
            images: [
              {
                url: `${minioContainer.publicUrl}/test-bucket/feed.webp`,
                key: "images/feed.webp",
                width: 1200,
                height: 800,
              },
            ],
          },
        })
        .expect(201);

      const res = await server
        .get("/posts")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      const postWithImage = res.body.find(
        (p: { content: { text: string } }) =>
          p.content.text === "Feed post with image",
      );
      expect(postWithImage).toBeDefined();
      expect(postWithImage.content.images).toHaveLength(1);
      expect(postWithImage.content.images[0].key).toBe("images/feed.webp");
    });

    it("should include images in recommendations", async () => {
      const server = request(testApp.app.getHttpServer());

      await server
        .post("/posts")
        .set("Cookie", userBCookie)
        .send({
          content: {
            text: "Recommended post with images",
            images: [
              {
                url: `${minioContainer.publicUrl}/test-bucket/rec.webp`,
                key: "images/rec.webp",
                width: 1000,
                height: 750,
              },
            ],
          },
        })
        .expect(201);

      const res = await server
        .get("/recommendations")
        .set("Cookie", userACookie)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      const postWithImage = res.body.items.find(
        (p: { content: { text: string } }) =>
          p.content.text === "Recommended post with images",
      );
      expect(postWithImage).toBeDefined();
      expect(postWithImage.content.images).toHaveLength(1);
      expect(postWithImage.content.images[0].key).toBe("images/rec.webp");
    });
  });
});
