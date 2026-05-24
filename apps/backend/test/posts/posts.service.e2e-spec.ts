import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

import { DatabaseService } from "@/db/database.service";
import { posts, postReactions, comments } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { DATABASE_POOL } from "@/db/tokens";
import { PostsService } from "@/posts/posts.service";
import { TagsService } from "@/tags/tags.service";

import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

import { StorageService } from "@/storage/storage.service";
import { UsersService } from "@/users/users.service";
import { NotificationsService } from "@/notifications/notifications.service";
import { EMBEDDING_SERVICE } from "@/embedding/embedding.interface";
import { StubEmbeddingService } from "@/embedding/stub-embedding.service";
import { NOTIFICATION_TRANSPORTS } from "@/notifications/transports/notification-transport.interface";
import { PgBossService } from "@wavezync/nestjs-pgboss";
import { ModerationPipelineService } from "@/moderation/moderation-pipeline.service";
import { ContentHashService } from "@/moderation/content-hash.service";

describe("PostsService integration", () => {
  let containers: PostgresContainerContext;
  let moduleRef: TestingModule;
  let pool: Pool;
  let databaseService: DatabaseService;
  let postsService: PostsService;

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
        PostsService,
        TagsService,
        {
          provide: StorageService,
          useValue: {
            deleteImages: async () => {},
          },
        },
        {
          provide: UsersService,
          useValue: {
            resolveAvatarUrl: (image: string | null) => image,
          },
        },
        {
          provide: PgBossService,
          useValue: {
            scheduleJob: async () => ({}),
          },
        },
        {
          provide: NOTIFICATION_TRANSPORTS,
          useValue: [],
        },
        NotificationsService,
        {
          provide: EMBEDDING_SERVICE,
          useClass: StubEmbeddingService,
        },
        {
          provide: ModerationPipelineService,
          useValue: {
            runPipeline: async () => {},
            processReport: async () => ({}),
          },
        },
        {
          provide: ContentHashService,
          useValue: {
            hash: () => "stub-hash",
            normalize: (text: string) => text,
          },
        },
      ],
    }).compile();

    databaseService = moduleRef.get(DatabaseService);
    postsService = moduleRef.get(PostsService);

    // Seed the two author users used across all tests.
    await databaseService.db
      .insert(user)
      .values([
        {
          id: "author-1",
          email: "author1@example.com",
          name: "Author One",
          emailVerified: false,
        },
        {
          id: "author-2",
          email: "author2@example.com",
          name: "Author Two",
          emailVerified: false,
        },
      ])
      .onConflictDoNothing();
  }, 120000);

  beforeEach(async () => {
    await databaseService.db.delete(posts);
  });

  afterAll(async () => {
    await moduleRef.close();
    await stopPostgresContainer(containers);
  });

  it("creates a post and reads it back from PostgreSQL", async () => {
    const created = await postsService.create("author-1", {
      content: {
        text: "Hello from integration test",
      },
    });

    const fetched = await postsService.getById(created.id, "author-1");

    expect(fetched).toEqual(created);
    expect(created.authorId).toBe("author-1");
    expect(created.author.id).toBe("author-1");
    expect(created.author.email).toBe("author1@example.com");
    expect(created.content).toEqual({
      text: "Hello from integration test",
    });
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.upvoteCount).toBe(0);
    expect(created.downvoteCount).toBe(0);
    expect(created.currentUserSubscribed).toBe(true);
  });

  it("lists posts in descending creation order", async () => {
    await databaseService.db.insert(posts).values([
      {
        authorId: "author-1",
        content: { text: "Older post" },
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
      {
        authorId: "author-2",
        content: { text: "Newer post" },
        createdAt: new Date("2024-01-02T00:00:00.000Z"),
        updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      },
    ]);

    const listedPosts = await postsService.list("test-user");

    expect(listedPosts).toHaveLength(2);
    expect(listedPosts.map((post) => post.content)).toEqual([
      { text: "Newer post" },
      { text: "Older post" },
    ]);
    expect(listedPosts[0].author.id).toBe("author-2");
    expect(listedPosts[1].author.id).toBe("author-1");
    expect(listedPosts[0].upvoteCount).toBe(0);
    expect(listedPosts[0].downvoteCount).toBe(0);
    expect(listedPosts[1].upvoteCount).toBe(0);
    expect(listedPosts[1].downvoteCount).toBe(0);
  });

  it("excludes hidden posts from the main list", async () => {
    const visiblePost = await postsService.create("author-1", {
      content: { text: "Visible post" },
    });
    const hiddenPost = await postsService.create("author-2", {
      content: { text: "Rejected post" },
    });

    await databaseService.db
      .update(posts)
      .set({ hidden: true })
      .where(eq(posts.id, hiddenPost.id));

    const listedPosts = await postsService.list("test-user");

    expect(listedPosts.map((post) => post.id)).toEqual([visiblePost.id]);
  });

  it("does not return hidden posts by id", async () => {
    const hiddenPost = await postsService.create("author-1", {
      content: { text: "Rejected post" },
    });

    await databaseService.db
      .update(posts)
      .set({ hidden: true })
      .where(eq(posts.id, hiddenPost.id));

    await expect(
      postsService.getById(hiddenPost.id, "author-1"),
    ).resolves.toBeNull();
  });

  it("updates only posts owned by the author", async () => {
    const created = await postsService.create("author-1", {
      content: {
        poll: {
          question: "Ship it?",
          options: [
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ],
          allowsMultipleSelections: false,
        },
      },
    });

    const unauthorizedUpdate = await postsService.update(
      created.id,
      "author-2",
      {
        content: {
          text: "Should not be saved",
        },
      },
    );
    const updated = await postsService.update(created.id, "author-1", {
      content: {
        visualization: {
          title: "Votes",
          visualizationType: "bar",
          data: [{ label: "Yes", value: 4 }],
        },
      },
    });

    expect(unauthorizedUpdate).toBeNull();
    expect(updated).not.toBeNull();
    expect(updated?.content).toEqual({
      visualization: {
        title: "Votes",
        visualizationType: "bar",
        data: [{ label: "Yes", value: 4 }],
      },
    });
    expect(updated?.author.id).toBe("author-1");
  });

  it("deletes only posts owned by the author", async () => {
    const created = await postsService.create("author-1", {
      content: {
        text: "Delete me",
      },
    });

    const unauthorizedDelete = await postsService.delete(
      created.id,
      "author-2",
    );
    const deleted = await postsService.delete(created.id, "author-1");
    const fetchedAfterDelete = await postsService.getById(created.id);

    expect(unauthorizedDelete).toBeNull();
    expect(deleted?.id).toBe(created.id);
    expect(fetchedAfterDelete).toBeNull();
  });

  describe("commentCount", () => {
    it("returns 0 commentCount when no comments exist", async () => {
      const post = await postsService.create("author-1", {
        content: { text: "Post with no comments" },
      });

      const fetched = await postsService.getById(post.id);
      expect(fetched?.commentCount).toBe(0);
    });

    it("returns the correct commentCount after comments are added", async () => {
      const post = await postsService.create("author-1", {
        content: { text: "Post with comments" },
      });

      await databaseService.db.insert(comments).values([
        { postId: post.id, authorId: "author-1", content: "First comment" },
        { postId: post.id, authorId: "author-2", content: "Second comment" },
      ]);

      const fetched = await postsService.getById(post.id);
      expect(fetched?.commentCount).toBe(2);
    });

    it("commentCount is reflected in list results", async () => {
      const post = await postsService.create("author-1", {
        content: { text: "Listed post with comments" },
      });

      await databaseService.db.insert(comments).values([
        { postId: post.id, authorId: "author-1", content: "Comment A" },
        { postId: post.id, authorId: "author-2", content: "Comment B" },
        { postId: post.id, authorId: "author-1", content: "Comment C" },
      ]);

      const listed = await postsService.list("author-1");
      const found = listed.find((p) => p.id === post.id);
      expect(found?.commentCount).toBe(3);
    });
  });

  describe("recommendations", () => {
    it("returns posts ordered by reaction count descending", async () => {
      // Create three posts
      const post1 = await postsService.create("author-1", {
        content: { text: "Post with 5 reactions" },
      });
      const post2 = await postsService.create("author-2", {
        content: { text: "Post with 10 reactions" },
      });
      const post3 = await postsService.create("author-1", {
        content: { text: "Post with 2 reactions" },
      });

      // Add reactions to posts
      await databaseService.db.insert(postReactions).values([
        { postId: post1.id, userId: "user-1", type: "upvote" },
        { postId: post1.id, userId: "user-2", type: "upvote" },
        { postId: post1.id, userId: "user-3", type: "upvote" },
        { postId: post1.id, userId: "user-4", type: "upvote" },
        { postId: post1.id, userId: "user-5", type: "upvote" },
        { postId: post2.id, userId: "user-1", type: "upvote" },
        { postId: post2.id, userId: "user-2", type: "upvote" },
        { postId: post2.id, userId: "user-3", type: "upvote" },
        { postId: post2.id, userId: "user-4", type: "upvote" },
        { postId: post2.id, userId: "user-5", type: "upvote" },
        { postId: post2.id, userId: "user-6", type: "upvote" },
        { postId: post2.id, userId: "user-7", type: "upvote" },
        { postId: post2.id, userId: "user-8", type: "upvote" },
        { postId: post2.id, userId: "user-9", type: "upvote" },
        { postId: post2.id, userId: "user-10", type: "upvote" },
        { postId: post3.id, userId: "user-1", type: "downvote" },
        { postId: post3.id, userId: "user-2", type: "upvote" },
      ]);

      const result = await postsService.recommendations("user-1", 10);

      expect(result.items).toHaveLength(3);
      expect(result.items[0].id).toBe(post2.id);
      expect(result.items[0].upvoteCount).toBe(10);
      expect(result.items[0].downvoteCount).toBe(0);
      expect(result.items[1].id).toBe(post1.id);
      expect(result.items[1].upvoteCount).toBe(5);
      expect(result.items[1].downvoteCount).toBe(0);
      expect(result.items[2].id).toBe(post3.id);
      expect(result.items[2].upvoteCount).toBe(1);
      expect(result.items[2].downvoteCount).toBe(1);
      expect(result.nextCursor).toBeNull();
    });

    it("returns posts with no reactions at the end", async () => {
      const postWithReactions = await postsService.create("author-1", {
        content: { text: "Popular post" },
      });
      const postWithoutReactions = await postsService.create("author-2", {
        content: { text: "Unpopular post" },
      });

      await databaseService.db.insert(postReactions).values({
        postId: postWithReactions.id,
        userId: "user-1",
        type: "upvote",
      });

      const result = await postsService.recommendations("user-1", 10);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(postWithReactions.id);
      expect(result.items[0].upvoteCount).toBe(1);
      expect(result.items[0].downvoteCount).toBe(0);
      expect(result.items[1].id).toBe(postWithoutReactions.id);
      expect(result.items[1].upvoteCount).toBe(0);
      expect(result.items[1].downvoteCount).toBe(0);
    });

    it("excludes hidden posts from recommendations", async () => {
      const visiblePost = await postsService.create("author-1", {
        content: { text: "Visible recommendation" },
      });
      const hiddenPost = await postsService.create("author-2", {
        content: { text: "Rejected recommendation" },
      });

      await databaseService.db
        .update(posts)
        .set({ hidden: true })
        .where(eq(posts.id, hiddenPost.id));

      await databaseService.db.insert(postReactions).values([
        { postId: hiddenPost.id, userId: "user-1", type: "upvote" },
        { postId: hiddenPost.id, userId: "user-2", type: "upvote" },
        { postId: visiblePost.id, userId: "user-1", type: "upvote" },
      ]);

      const result = await postsService.recommendations("user-1", 10);

      expect(result.items.map((post) => post.id)).toEqual([visiblePost.id]);
    });

    it("respects the limit parameter", async () => {
      await postsService.create("author-1", { content: { text: "Post 1" } });
      await postsService.create("author-1", { content: { text: "Post 2" } });
      await postsService.create("author-1", { content: { text: "Post 3" } });
      await postsService.create("author-1", { content: { text: "Post 4" } });
      await postsService.create("author-1", { content: { text: "Post 5" } });

      const result = await postsService.recommendations("user-1", 3);

      expect(result.items).toHaveLength(3);
      expect(result.nextCursor).not.toBeNull();
    });

    it("paginates correctly with cursor", async () => {
      // Create 5 posts with different reaction counts
      const posts: Array<{ id: string }> = [];
      for (let i = 1; i <= 5; i++) {
        const post = await postsService.create("author-1", {
          content: { text: `Post ${i}` },
        });
        posts.push(post);
      }

      // Add reactions: post 5 gets 5 reactions, post 4 gets 4, etc.
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j <= i; j++) {
          await databaseService.db.insert(postReactions).values({
            postId: posts[4 - i].id,
            userId: `user-${j}`,
            type: "upvote",
          });
        }
      }

      // First page: limit 2
      const page1 = await postsService.recommendations("user-1", 2);
      expect(page1.items).toHaveLength(2);
      expect(page1.items[0].id).toBe(posts[0].id);
      expect(page1.items[1].id).toBe(posts[1].id);
      expect(page1.nextCursor).not.toBeNull();

      // Second page: use cursor
      const page2 = await postsService.recommendations(
        "user-1",
        2,
        page1.nextCursor!,
      );
      expect(page2.items).toHaveLength(2);
      expect(page2.items[0].id).toBe(posts[2].id);
      expect(page2.items[1].id).toBe(posts[3].id);
      expect(page2.nextCursor).not.toBeNull();

      // Third page: last item
      const page3 = await postsService.recommendations(
        "user-1",
        2,
        page2.nextCursor!,
      );
      expect(page3.items).toHaveLength(1);
      expect(page3.items[0].id).toBe(posts[4].id);
      expect(page3.nextCursor).toBeNull();
    });

    it("handles invalid cursor gracefully", async () => {
      await postsService.create("author-1", { content: { text: "Post 1" } });

      const result = await postsService.recommendations(
        "user-1",
        10,
        "invalid-cursor",
      );

      // Should return all posts (cursor is ignored when invalid)
      expect(result.items).toHaveLength(1);
    });

    it("returns empty array when no posts exist", async () => {
      const result = await postsService.recommendations("user-1", 10);

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it("orders by post ID ascending as tiebreaker when reaction counts are equal", async () => {
      const post1 = await postsService.create("author-1", {
        content: { text: "Post A" },
      });
      const post2 = await postsService.create("author-2", {
        content: { text: "Post B" },
      });
      const post3 = await postsService.create("author-1", {
        content: { text: "Post C" },
      });

      // All posts get exactly 1 upvote
      await databaseService.db.insert(postReactions).values([
        { postId: post1.id, userId: "user-1", type: "upvote" },
        { postId: post2.id, userId: "user-2", type: "upvote" },
        { postId: post3.id, userId: "user-3", type: "upvote" },
      ]);

      const result = await postsService.recommendations("user-1", 10);

      expect(result.items).toHaveLength(3);
      // All have same reaction count, so should be ordered by post.id ascending
      const ids = result.items.map((p) => p.id);
      const sortedIds = [...ids].sort();
      expect(ids).toEqual(sortedIds);
    });
  });
});
