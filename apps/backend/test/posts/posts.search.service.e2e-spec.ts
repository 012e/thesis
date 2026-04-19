import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { Pool } from "pg";

import { DatabaseService } from "@/db/database.service";
import { posts } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { DATABASE_POOL } from "@/db/tokens";
import { PostsService } from "@/posts/posts.service";
import { StorageService } from "@/storage/storage.service";
import { UsersService } from "@/users/users.service";

import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("PostsService.search integration", () => {
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
        { provide: DATABASE_POOL, useValue: pool },
        DatabaseService,
        PostsService,
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
      ],
    }).compile();

    databaseService = moduleRef.get(DatabaseService);
    postsService = moduleRef.get(PostsService);

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

  it("returns posts whose text contains the exact query term", async () => {
    await postsService.create("search-author-1", {
      content: { text: "TypeScript is a strongly typed programming language" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Python is great for data science" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Learning JavaScript fundamentals" },
    });

    const results = await postsService.search("TypeScript", "search-author-1");

    expect(results.length).toBeGreaterThan(0);
    const texts = results.map((p) => p.content.text?.toLowerCase() ?? "");
    expect(texts.every((t) => t.includes("typescript"))).toBe(true);
  });

  it("returns posts matching any term in a multi-word query (BM25 conjunction)", async () => {
    await postsService.create("search-author-1", {
      content: { text: "React hooks make state management simple" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Vue components and state management patterns" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Completely unrelated post about cooking recipes" },
    });

    const results = await postsService.search(
      "state management",
      "search-author-1",
    );

    // Both React and Vue posts mention "state management" — both should be returned
    expect(results.length).toBeGreaterThanOrEqual(2);
    const texts = results.map((p) => p.content.text?.toLowerCase() ?? "");
    expect(
      texts.every((t) => t.includes("state") || t.includes("management")),
    ).toBe(true);
  });

  it("does not return posts whose text does not match the query", async () => {
    await postsService.create("search-author-1", {
      content: { text: "Rust memory safety and ownership model" },
    });
    await postsService.create("search-author-1", {
      content: { text: "Go concurrency with goroutines and channels" },
    });

    const results = await postsService.search("kubernetes", "search-author-1");

    expect(results).toHaveLength(0);
  });

  it("returns an empty array when no posts exist", async () => {
    const results = await postsService.search("anything", "search-author-1");
    expect(results).toHaveLength(0);
  });

  it("returns results with correct PostDto shape", async () => {
    await postsService.create("search-author-1", {
      content: { text: "NestJS dependency injection patterns" },
    });

    const results = await postsService.search("NestJS", "search-author-1");

    expect(results.length).toBeGreaterThan(0);
    const post = results[0];
    expect(post.id).toBeTruthy();
    expect(post.authorId).toBe("search-author-1");
    expect(post.author).toBeDefined();
    expect(post.author.id).toBe("search-author-1");
    expect(post.content.text).toBeDefined();
    expect(post.upvoteCount).toBe(0);
    expect(post.downvoteCount).toBe(0);
    expect(post.currentUserReaction).toBeNull();
  });

  it("is case-insensitive", async () => {
    await postsService.create("search-author-1", {
      content: { text: "Docker containerization best practices" },
    });

    const resultsLower = await postsService.search("docker", "search-author-1");
    const resultsUpper = await postsService.search("DOCKER", "search-author-1");
    const resultsMixed = await postsService.search("Docker", "search-author-1");

    expect(resultsLower.length).toBeGreaterThan(0);
    expect(resultsUpper.length).toBeGreaterThan(0);
    expect(resultsMixed.length).toBeGreaterThan(0);
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
    const results = await postsService.search("favourite", "search-author-1");

    expect(results).toHaveLength(0);
  });

  it("ranks more-relevant posts higher", async () => {
    // One post mentions "database" three times; another only once.
    await postsService.create("search-author-1", {
      content: {
        text: "Database performance is critical. Tuning your database queries and database indexes matters.",
      },
    });
    await postsService.create("search-author-1", {
      content: { text: "Use a database for persistent storage" },
    });

    const results = await postsService.search("database", "search-author-1");

    expect(results.length).toBeGreaterThanOrEqual(2);
    // The post mentioning "database" more frequently should rank first (higher BM25 score)
    expect(results[0].content.text).toMatch(/database.*database/i);
  });
});
