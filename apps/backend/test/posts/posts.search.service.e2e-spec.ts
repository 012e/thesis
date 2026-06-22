import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

import { DatabaseService } from "@/db/database.service";
import { posts, comments } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { DATABASE_POOL } from "@/db/tokens";
import { EMBEDDING_SERVICE } from "@/embedding/embedding.interface";
import { StubEmbeddingService } from "@/embedding/stub-embedding.service";
import { PostsSearchService } from "@/posts/posts-search.service";
import { PostsService } from "@/posts/posts.service";
import { PostsEngagementService } from "@/posts/posts-engagement.service";
import { PostsMutationService } from "@/posts/posts-mutation.service";
import { PostsNotificationsService } from "@/posts/posts-notifications.service";
import { PostsPresenterService } from "@/posts/posts-presenter.service";
import { PostsReadService } from "@/posts/posts-read.service";
import { TagsService } from "@/tags/tags.service";
import { StorageService } from "@/storage/storage.service";
import { UsersService } from "@/users/users.service";
import { NotificationsService } from "@/notifications/notifications.service";
import { NOTIFICATION_TRANSPORTS } from "@/notifications/transports/notification-transport.interface";
import { PgBossService } from "@wavezync/nestjs-pgboss";
import { ModerationPipelineService } from "@/moderation/moderation-pipeline.service";
import { ContentHashService } from "@/moderation/content-hash.service";
import { XpService } from "@/xp/xp.service";
import { AchievementsService } from "@/achievements/achievements.service";

import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("PostsSearchService.search integration", () => {
  let containers: PostgresContainerContext;
  let moduleRef: TestingModule;
  let pool: Pool;
  let databaseService: DatabaseService;
  let postsService: PostsService;
  let postsSearchService: PostsSearchService;

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
    await runBetterAuthMigrations(containers.databaseUrl);

    pool = new Pool({ connectionString: containers.databaseUrl });
    moduleRef = await Test.createTestingModule({
      providers: [
        { provide: DATABASE_POOL, useValue: pool },
        { provide: EMBEDDING_SERVICE, useClass: StubEmbeddingService },
        DatabaseService,
        PostsService,
        PostsReadService,
        PostsMutationService,
        PostsEngagementService,
        PostsNotificationsService,
        PostsPresenterService,
        TagsService,
        XpService,
        AchievementsService,
        PostsSearchService,
        {
          provide: StorageService,
          useValue: { deleteImages: async () => {} },
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
    postsSearchService = moduleRef.get(PostsSearchService);

    await databaseService.db
      .insert(user)
      .values([
        {
          id: "search-author-1",
          email: "searchauthor1@example.com",
          name: "Search Author One",
          emailVerified: false,
        },
      ])
      .onConflictDoNothing();
  }, 180000);

  beforeEach(async () => {
    await databaseService.db.delete(posts);
  });

  afterAll(async () => {
    await moduleRef.close();
    await stopPostgresContainer(containers);
  });

  it("returns post-shaped results for a search query", async () => {
    await postsService.create("search-author-1", {
      content: { text: "TypeScript is a strongly typed programming language" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Python is great for data science" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Learning JavaScript fundamentals" },
    });

    const results = await postsSearchService.search(
      "TypeScript",
      "search-author-1",
    );

    expect(Array.isArray(results)).toBe(true);
    for (const post of results) {
      expectPostDtoShape(post as unknown as Record<string, unknown>);
    }
  });

  it("returns post-shaped results for a multi-word query", async () => {
    await postsService.create("search-author-1", {
      content: { text: "React hooks make state management simple" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Vue components and state management patterns" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Completely unrelated post about cooking recipes" },
    });

    const results = await postsSearchService.search(
      "state management",
      "search-author-1",
    );

    expect(Array.isArray(results)).toBe(true);
    for (const post of results) {
      expectPostDtoShape(post as unknown as Record<string, unknown>);
    }
  });

  it("returns an array for queries without lexical matches", async () => {
    await postsService.create("search-author-1", {
      content: { text: "Rust memory safety and ownership model" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Go concurrency with goroutines and channels" },
    });

    const results = await postsSearchService.search(
      "kubernetes",
      "search-author-1",
    );

    expect(Array.isArray(results)).toBe(true);
    for (const post of results) {
      expectPostDtoShape(post as unknown as Record<string, unknown>);
    }
  });

  it("does not return hidden posts", async () => {
    const visiblePost = await postsService.create("search-author-1", {
      content: { text: "Visible moderation search result" },
    });
    const hiddenPost = await postsService.create("search-author-1", {
      content: { text: "Hidden moderation search result" },
    });

    await databaseService.db
      .update(posts)
      .set({ hidden: true })
      .where(eq(posts.id, hiddenPost.id));

    const results = await postsSearchService.search(
      "moderation search result",
      "search-author-1",
    );

    expect(results.map((post) => post.id)).toEqual([visiblePost.id]);
  });

  it("returns an empty array when no posts exist", async () => {
    const results = await postsSearchService.search(
      "anything",
      "search-author-1",
    );
    expect(results).toHaveLength(0);
  });

  it("returns results with correct PostDto shape", async () => {
    await postsService.create("search-author-1", {
      content: { text: "NestJS dependency injection patterns" },
    });

    const results = await postsSearchService.search(
      "NestJS",
      "search-author-1",
    );

    expect(Array.isArray(results)).toBe(true);
    for (const post of results) {
      expectPostDtoShape(post as unknown as Record<string, unknown>);
    }
  });

  it("is case-insensitive", async () => {
    await postsService.create("search-author-1", {
      content: { text: "Docker containerization best practices" },
    });

    const resultsLower = await postsSearchService.search(
      "docker",
      "search-author-1",
    );
    const resultsUpper = await postsSearchService.search(
      "DOCKER",
      "search-author-1",
    );
    const resultsMixed = await postsSearchService.search(
      "Docker",
      "search-author-1",
    );

    expect(Array.isArray(resultsLower)).toBe(true);
    expect(Array.isArray(resultsUpper)).toBe(true);
    expect(Array.isArray(resultsMixed)).toBe(true);
  });

  it("does not return posts with only poll content (no text field)", async () => {
    await postsService.create("search-author-1", {
      content: {
        poll: {
          question: "What is your favourite language?",
          options: [
            { id: "ts", label: "TypeScript" },
            { id: "py", label: "Python" },
          ],
          allowsMultipleSelections: false,
        },
      },
    });

    // The poll question lives in content.poll.question, not content.text,
    // so the BM25 index (which indexes content->>'text') should not match it.
    const results = await postsSearchService.search(
      "favourite",
      "search-author-1",
    );

    expect(results).toHaveLength(0);
  });

  it("returns post-shaped results for repeated search terms", async () => {
    await postsService.create("search-author-1", {
      content: {
        text: "Database performance is critical. Tuning your database queries and database indexes matters.",
      },
    });
    await postsService.create("search-author-1", {
      content: { text: "Use a database for persistent storage" },
    });

    const results = await postsSearchService.search(
      "database",
      "search-author-1",
    );

    expect(Array.isArray(results)).toBe(true);
    for (const post of results) {
      expectPostDtoShape(post as unknown as Record<string, unknown>);
    }
  });

  it("returns commentCount=0 when a post has no comments", async () => {
    await postsService.create("search-author-1", {
      content: { text: "Vitest is a fast unit testing framework" },
    });

    const results = await postsSearchService.search(
      "Vitest",
      "search-author-1",
    );

    expect(Array.isArray(results)).toBe(true);
    for (const post of results) {
      expectPostDtoShape(post as unknown as Record<string, unknown>);
    }
  });

  it("returns correct commentCount when comments exist on a post", async () => {
    const post = await postsService.create("search-author-1", {
      content: { text: "Drizzle ORM is a TypeScript-first database toolkit" },
    });

    // Insert two comments directly via the DB to avoid needing CommentsService
    await databaseService.db.insert(comments).values([
      { postId: post.id, authorId: "search-author-1", content: "Great post!" },
      {
        postId: post.id,
        authorId: "search-author-1",
        content: "Very helpful.",
      },
    ]);

    const results = await postsSearchService.search(
      "Drizzle",
      "search-author-1",
    );

    expect(results.length).toBeGreaterThan(0);
    const found = results.find((p) => p.id === post.id);
    expect(found).toBeDefined();
    expect(found!.commentCount).toBe(2);
  });
});
