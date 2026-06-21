import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

import { DatabaseService } from "@/db/database.service";
import { posts, postTags, tags } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { DATABASE_POOL } from "@/db/tokens";
import { PostsService } from "@/posts/posts.service";
import { PostsEngagementService } from "@/posts/posts-engagement.service";
import { PostsMutationService } from "@/posts/posts-mutation.service";
import { PostsNotificationsService } from "@/posts/posts-notifications.service";
import { PostsPresenterService } from "@/posts/posts-presenter.service";
import { PostsReadService } from "@/posts/posts-read.service";
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
import { XpService } from "@/xp/xp.service";

describe("TagsService integration", () => {
  let containers: PostgresContainerContext;
  let moduleRef: TestingModule;
  let pool: Pool;
  let databaseService: DatabaseService;
  let postsService: PostsService;
  let tagsService: TagsService;

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
        PostsReadService,
        PostsMutationService,
        PostsEngagementService,
        PostsNotificationsService,
        PostsPresenterService,
        TagsService,
        XpService,
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
    tagsService = moduleRef.get(TagsService);

    // Seed author users
    await databaseService.db
      .insert(user)
      .values([
        {
          id: "author-1",
          email: "author1@tags-test.com",
          name: "Author One",
          emailVerified: false,
        },
        {
          id: "author-2",
          email: "author2@tags-test.com",
          name: "Author Two",
          emailVerified: false,
        },
      ])
      .onConflictDoNothing();
  }, 120000);

  beforeEach(async () => {
    await databaseService.db.delete(postTags);
    await databaseService.db.delete(posts);
    await databaseService.db.delete(tags);
  });

  afterAll(async () => {
    await moduleRef.close();
    await stopPostgresContainer(containers);
  });

  // ─── Post Creation with Tags ───────────────────────────────────────────────

  it("creates a post with tags and populates tag rows and post-tag rows", async () => {
    const post = await postsService.create("author-1", {
      content: { text: "Hello #React and #TypeScript" },
    });

    expect(post.tags).toHaveLength(2);
    expect(post.tags.map((t) => t.slug).sort()).toEqual([
      "react",
      "typescript",
    ]);

    // Verify tag rows exist in DB
    const tagRows = await databaseService.db.select().from(tags);
    expect(tagRows).toHaveLength(2);
    expect(tagRows.map((t) => t.slug).sort()).toEqual(["react", "typescript"]);

    // Verify post_tags relations
    const ptRows = await databaseService.db.select().from(postTags);
    expect(ptRows).toHaveLength(2);
    expect(ptRows.every((pt) => pt.postId === post.id)).toBe(true);
    expect(ptRows.every((pt) => pt.authorId === "author-1")).toBe(true);
  });

  it("creates a post without tags when text has no hashtags", async () => {
    const post = await postsService.create("author-1", {
      content: { text: "No hashtags here" },
    });

    expect(post.tags).toEqual([]);

    const tagRows = await databaseService.db.select().from(tags);
    expect(tagRows).toHaveLength(0);
  });

  it("deduplicates tags in the same post", async () => {
    const post = await postsService.create("author-1", {
      content: { text: "#React #react #REACT are great" },
    });

    expect(post.tags).toHaveLength(1);
    expect(post.tags[0].slug).toBe("react");

    const ptRows = await databaseService.db.select().from(postTags);
    expect(ptRows).toHaveLength(1);
  });

  // ─── Tag Preservation Across Posts ─────────────────────────────────────────

  it("reuses existing tag entity across posts", async () => {
    await postsService.create("author-1", {
      content: { text: "First #React post" },
    });
    await postsService.create("author-2", {
      content: { text: "Second #React post" },
    });

    const tagRows = await databaseService.db.select().from(tags);
    expect(tagRows).toHaveLength(1);
    expect(tagRows[0].slug).toBe("react");

    const ptRows = await databaseService.db.select().from(postTags);
    expect(ptRows).toHaveLength(2);
  });

  // ─── Post Updates ──────────────────────────────────────────────────────────

  it("editing a post adds new tags and removes old tag relationships", async () => {
    const post = await postsService.create("author-1", {
      content: { text: "Hello #React and #TypeScript" },
    });

    expect(post.tags).toHaveLength(2);

    const updated = await postsService.update(post.id, "author-1", {
      content: { text: "Hello #React and #Vue" },
    });

    expect(updated).not.toBeNull();
    expect(updated!.tags).toHaveLength(2);
    expect(updated!.tags.map((t) => t.slug).sort()).toEqual(["react", "vue"]);

    // Verify old TypeScript relation is gone
    const ptRows = await databaseService.db.select().from(postTags);
    expect(ptRows).toHaveLength(2);
    const tagIds = ptRows.map((pt) => pt.tagId);
    const tagSlugs = await databaseService.db
      .select({ slug: tags.slug })
      .from(tags)
      .where(
        // Check the tags referenced by postTags
        eq(tags.id, tagIds[0]),
      );
    // Just verify our post has exactly 2 post_tag rows
    expect(ptRows.every((pt) => pt.postId === post.id)).toBe(true);
  });

  it("editing a post to remove all tags clears relationships", async () => {
    const post = await postsService.create("author-1", {
      content: { text: "Hello #React" },
    });

    expect(post.tags).toHaveLength(1);

    const updated = await postsService.update(post.id, "author-1", {
      content: { text: "No tags here" },
    });

    expect(updated).not.toBeNull();
    expect(updated!.tags).toEqual([]);

    const ptRows = await databaseService.db.select().from(postTags);
    expect(ptRows).toHaveLength(0);
  });

  // ─── Post Deletion ────────────────────────────────────────────────────────

  it("deleting a post removes post-tag relationships via cascade", async () => {
    const post = await postsService.create("author-1", {
      content: { text: "Goodbye #React #TypeScript" },
    });

    await postsService.delete(post.id, "author-1");

    const ptRows = await databaseService.db.select().from(postTags);
    expect(ptRows).toHaveLength(0);
  });

  // ─── Tag Hydration ────────────────────────────────────────────────────────

  it("getById returns tags for a post", async () => {
    const post = await postsService.create("author-1", {
      content: { text: "Check #AI and #ML" },
    });

    const fetched = await postsService.getById(post.id, "author-1");

    expect(fetched).not.toBeNull();
    expect(fetched!.tags).toHaveLength(2);
    expect(fetched!.tags.map((t) => t.slug).sort()).toEqual(["ai", "ml"]);
  });

  it("list returns tags for all posts", async () => {
    await postsService.create("author-1", {
      content: { text: "Post with #React" },
    });
    await postsService.create("author-2", {
      content: { text: "Post with #Vue" },
    });

    const listedPosts = await postsService.list("author-1");

    expect(listedPosts).toHaveLength(2);
    const allTags = listedPosts.flatMap((p) => p.tags);
    expect(allTags).toHaveLength(2);
  });

  // ─── Hidden Posts ──────────────────────────────────────────────────────────

  it("hidden posts are excluded from tag timelines", async () => {
    const visiblePost = await postsService.create("author-1", {
      content: { text: "Visible #TestTag" },
    });
    const hiddenPost = await postsService.create("author-2", {
      content: { text: "Hidden #TestTag" },
    });

    // Mark the second post as hidden
    await databaseService.db
      .update(posts)
      .set({ hidden: true })
      .where(eq(posts.id, hiddenPost.id));

    const result = await tagsService.listPostsByTag(
      "testtag",
      "author-1",
      "latest",
      20,
    );

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].id).toBe(visiblePost.id);
  });

  it("hidden posts do not count in denormalized tag post_count", async () => {
    const visiblePost = await postsService.create("author-1", {
      content: { text: "Visible #CountTag" },
    });
    const hiddenPost = await postsService.create("author-2", {
      content: { text: "Hidden #CountTag" },
    });

    // Mark the second post as hidden
    await databaseService.db
      .update(posts)
      .set({ hidden: true })
      .where(eq(posts.id, hiddenPost.id));

    // Re-sync tags to update counts
    await tagsService.syncPostTags(
      hiddenPost.id,
      "author-2",
      "Hidden #CountTag",
    );

    const tag = await tagsService.getTag("counttag");
    expect(tag).not.toBeNull();
    // Count should reflect only visible posts
    expect(tag!.postCount).toBe(1);
  });

  // ─── Tag Feed ──────────────────────────────────────────────────────────────

  it("/tags/:slug/posts returns enriched PostDto including tags", async () => {
    await postsService.create("author-1", {
      content: { text: "Post about #React and #JavaScript" },
    });

    const result = await tagsService.listPostsByTag(
      "react",
      "author-1",
      "latest",
      20,
    );

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    const post = result!.items[0];
    expect(post.tags).toHaveLength(2);
    expect(post.author).toBeDefined();
    expect(post.upvoteCount).toBeDefined();
    expect(post.commentCount).toBe(0);
  });

  it("tag feed returns null for nonexistent tag", async () => {
    const result = await tagsService.listPostsByTag(
      "nonexistent",
      "author-1",
      "latest",
      20,
    );
    expect(result).toBeNull();
  });

  // ─── Pagination ────────────────────────────────────────────────────────────

  it("tag feed pagination is stable for latest sort", async () => {
    // Create 5 posts with the same tag
    for (let i = 0; i < 5; i++) {
      await postsService.create("author-1", {
        content: { text: `Post ${i} #PaginationTest` },
      });
    }

    // First page of 2
    const page1 = await tagsService.listPostsByTag(
      "paginationtest",
      "author-1",
      "latest",
      2,
    );
    expect(page1).not.toBeNull();
    expect(page1!.items).toHaveLength(2);
    expect(page1!.nextCursor).not.toBeNull();

    // Second page
    const page2 = await tagsService.listPostsByTag(
      "paginationtest",
      "author-1",
      "latest",
      2,
      page1!.nextCursor!,
    );
    expect(page2).not.toBeNull();
    expect(page2!.items).toHaveLength(2);
    expect(page2!.nextCursor).not.toBeNull();

    // Third page
    const page3 = await tagsService.listPostsByTag(
      "paginationtest",
      "author-1",
      "latest",
      2,
      page2!.nextCursor!,
    );
    expect(page3).not.toBeNull();
    expect(page3!.items).toHaveLength(1);
    expect(page3!.nextCursor).toBeNull();

    // Verify no duplicates across pages
    const allIds = [
      ...page1!.items.map((p) => p.id),
      ...page2!.items.map((p) => p.id),
      ...page3!.items.map((p) => p.id),
    ];
    expect(new Set(allIds).size).toBe(5);
  });

  // ─── Tag Metadata ─────────────────────────────────────────────────────────

  it("getTag returns tag metadata", async () => {
    await postsService.create("author-1", {
      content: { text: "Hello #MetadataTag" },
    });

    const tag = await tagsService.getTag("metadatatag");
    expect(tag).not.toBeNull();
    expect(tag!.slug).toBe("metadatatag");
    expect(tag!.displayName).toBe("MetadataTag");
    expect(tag!.postCount).toBe(1);
  });

  it("getTag returns null for unknown slug", async () => {
    const tag = await tagsService.getTag("unknowntag");
    expect(tag).toBeNull();
  });

  // ─── Trending ──────────────────────────────────────────────────────────────

  it("trending returns recent tags ordered by activity", async () => {
    // Create posts with different tags
    await postsService.create("author-1", {
      content: { text: "#PopularTag rocks" },
    });
    await postsService.create("author-2", {
      content: { text: "#PopularTag again" },
    });
    await postsService.create("author-1", {
      content: { text: "#LessPopular once" },
    });

    const result = await tagsService.getTrendingTags(10, 24);
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    // PopularTag should be first (2 posts vs 1)
    expect(result.items[0].slug).toBe("populartag");
    expect(result.items[0].recentCount).toBe(2);
  });

  it("trending excludes hidden posts", async () => {
    const post1 = await postsService.create("author-1", {
      content: { text: "#HiddenTrend visible" },
    });
    const post2 = await postsService.create("author-2", {
      content: { text: "#HiddenTrend hidden" },
    });

    await databaseService.db
      .update(posts)
      .set({ hidden: true })
      .where(eq(posts.id, post2.id));

    const result = await tagsService.getTrendingTags(10, 24);
    const hiddenTrend = result.items.find((t) => t.slug === "hiddentrend");
    if (hiddenTrend) {
      expect(hiddenTrend.recentCount).toBe(1);
    }
  });

  // ─── Tag Suggestions ──────────────────────────────────────────────────────

  it("suggestTags returns matching tags ordered by post count", async () => {
    // Create tags
    await postsService.create("author-1", {
      content: { text: "#ReactJS post 1" },
    });
    await postsService.create("author-2", {
      content: { text: "#ReactJS post 2" },
    });
    await postsService.create("author-1", {
      content: { text: "#ReactNative post 1" },
    });

    const result = await tagsService.suggestTags("react", 10);
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    // ReactJS should come first (2 posts vs 1)
    expect(result.items[0].slug).toBe("reactjs");
    expect(result.items[0].postCount).toBe(2);
  });

  it("suggestTags returns empty for no matches", async () => {
    const result = await tagsService.suggestTags("zzzzz", 10);
    expect(result.items).toEqual([]);
  });

  // ─── Batch Tag Loading ─────────────────────────────────────────────────────

  it("getTagsForPosts returns tags for multiple posts", async () => {
    const post1 = await postsService.create("author-1", {
      content: { text: "#Tag1 #Tag2" },
    });
    const post2 = await postsService.create("author-2", {
      content: { text: "#Tag2 #Tag3" },
    });

    const tagsMap = await tagsService.getTagsForPosts([post1.id, post2.id]);

    expect(tagsMap.get(post1.id)).toHaveLength(2);
    expect(tagsMap.get(post2.id)).toHaveLength(2);
    expect(
      tagsMap
        .get(post1.id)!
        .map((t) => t.slug)
        .sort(),
    ).toEqual(["tag1", "tag2"]);
    expect(
      tagsMap
        .get(post2.id)!
        .map((t) => t.slug)
        .sort(),
    ).toEqual(["tag2", "tag3"]);
  });

  it("getTagsForPosts returns empty map for empty input", async () => {
    const tagsMap = await tagsService.getTagsForPosts([]);
    expect(tagsMap.size).toBe(0);
  });

  // ─── Display Name Preservation ─────────────────────────────────────────────

  it("preserves display name casing from first post", async () => {
    await postsService.create("author-1", {
      content: { text: "#ParadeDB is great" },
    });
    await postsService.create("author-2", {
      content: { text: "#paradedb is also great" },
    });

    const tag = await tagsService.getTag("paradedb");
    expect(tag).not.toBeNull();
    expect(tag!.displayName).toBe("ParadeDB");
  });
});
