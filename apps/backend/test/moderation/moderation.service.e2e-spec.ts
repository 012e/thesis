import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

import { user } from "@/db/auth-schema";
import { DatabaseService } from "@/db/database.service";
import {
  postFlags,
  postModeration,
  postReports,
  postTags,
  posts,
  tags,
} from "@/db/schema";
import { DATABASE_POOL } from "@/db/tokens";
import { ModerationService } from "@/moderation/moderation.service";

import { runBetterAuthMigrations } from "../helpers/database.setup";
import {
  startPostgresContainer,
  stopPostgresContainer,
  type PostgresContainerContext,
} from "../helpers/testcontainers.setup";

describe("ModerationService integration", () => {
  let containers: PostgresContainerContext;
  let moduleRef: TestingModule;
  let pool: Pool;
  let databaseService: DatabaseService;
  let moderationService: ModerationService;

  const createPost = async (
    authorId: string,
    text: string,
    hidden: boolean = false,
  ) => {
    const [post] = await databaseService.db
      .insert(posts)
      .values({
        authorId,
        content: { text },
        hidden,
      })
      .returning();
    return post;
  };

  beforeAll(async () => {
    containers = await startPostgresContainer();
    await runBetterAuthMigrations(containers.databaseUrl);

    pool = new Pool({ connectionString: containers.databaseUrl });
    moduleRef = await Test.createTestingModule({
      providers: [
        { provide: DATABASE_POOL, useValue: pool },
        DatabaseService,
        ModerationService,
      ],
    }).compile();

    databaseService = moduleRef.get(DatabaseService);
    moderationService = moduleRef.get(ModerationService);

    await databaseService.db
      .insert(user)
      .values([
        {
          id: "author-1",
          email: "author1@example.com",
          name: "Author One",
          emailVerified: false,
          username: "author-one",
        },
        {
          id: "author-2",
          email: "author2@example.com",
          name: "Author Two",
          emailVerified: false,
          username: "author-two",
        },
        {
          id: "reporter-1",
          email: "reporter1@example.com",
          name: "Reporter One",
          emailVerified: false,
          username: "reporter-one",
        },
        {
          id: "admin-1",
          email: "admin1@example.com",
          name: "Admin One",
          emailVerified: false,
          username: "admin-one",
        },
      ])
      .onConflictDoNothing();
  }, 120000);

  beforeEach(async () => {
    await databaseService.db.delete(postFlags);
    await databaseService.db.delete(postReports);
    await databaseService.db.delete(postModeration);
    await databaseService.db.delete(posts);
    await databaseService.db.delete(tags);
  });

  afterAll(async () => {
    await moduleRef.close();
    await stopPostgresContainer(containers);
  });

  it("creates and retrieves moderation records with joined post data", async () => {
    const post = await createPost("author-1", "Moderated content");
    const [tag] = await databaseService.db
      .insert(tags)
      .values({ slug: "moderation", displayName: "moderation" })
      .returning();
    await databaseService.db.insert(postTags).values({
      postId: post.id,
      tagId: tag.id,
      authorId: "author-1",
    });
    const similarPostId = randomUUID();

    const created = await moderationService.createModerationRecord({
      postId: post.id,
      source: "auto_duplicate",
      status: "needs_human_review",
      priority: "high",
      llmConfidence: 83,
      llmSummary: "Very similar content",
      similarPostId,
      similarityScore: 0.93,
      moderationResult: { reason: "duplicate" },
    });

    expect(created.postId).toBe(post.id);
    expect(created.llmConfidence).toBe("83");
    expect(created.similarityScore).toBe("0.93");

    const fetched = await moderationService.getModerationRecord(created.id);

    expect(fetched).not.toBeNull();
    expect(fetched).toMatchObject({
      id: created.id,
      postId: post.id,
      source: "auto_duplicate",
      status: "needs_human_review",
      priority: "high",
      llmConfidence: "83",
      llmSummary: "Very similar content",
      similarPostId,
      similarityScore: "0.93",
    });
    expect(fetched.post).toMatchObject({
      id: post.id,
      authorId: "author-1",
      content: { text: "Moderated content" },
      currentUserBookmarked: false,
      tags: [{ id: tag.id, slug: "moderation", displayName: "moderation" }],
      hidden: false,
      author: {
        id: "author-1",
        username: "author-one",
        name: "Author One",
      },
    });
  });

  it("lists moderation records with filtering and pagination", async () => {
    const postOne = await createPost("author-1", "First post");
    const postTwo = await createPost("author-2", "Second post");
    const postThree = await createPost("author-1", "Third post");

    await moderationService.createModerationRecord({
      postId: postOne.id,
      source: "auto_duplicate",
      status: "pending",
      priority: "medium",
    });
    await moderationService.createModerationRecord({
      postId: postTwo.id,
      source: "auto_harmful",
      status: "rejected",
      priority: "high",
    });
    await moderationService.createModerationRecord({
      postId: postThree.id,
      source: "user_report",
      status: "needs_human_review",
      priority: "medium",
    });

    const filtered = await moderationService.listModerationRecords({
      status: "rejected",
      source: "auto_harmful",
      page: 0,
      pageSize: 10,
    });
    const paged = await moderationService.listModerationRecords({
      page: 1,
      pageSize: 2,
    });

    expect(filtered.total).toBe(1);
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]).toMatchObject({
      postId: postTwo.id,
      source: "auto_harmful",
      status: "rejected",
      priority: "high",
      post: {
        id: postTwo.id,
        currentUserBookmarked: false,
        tags: [],
      },
    });

    expect(paged.total).toBe(3);
    expect(paged.page).toBe(1);
    expect(paged.pageSize).toBe(2);
    expect(paged.items).toHaveLength(1);
  });

  it("reviews moderation records and hides or unhides posts appropriately", async () => {
    const rejectPost = await createPost("author-1", "Reject me");
    const approvePost = await createPost("author-1", "Approve me", true);
    const stickyHiddenPost = await createPost("author-2", "Stay hidden", true);

    const rejectRecord = await moderationService.createModerationRecord({
      postId: rejectPost.id,
      source: "user_report",
    });
    const approveRecord = await moderationService.createModerationRecord({
      postId: approvePost.id,
      source: "user_report",
    });
    await moderationService.createModerationRecord({
      postId: stickyHiddenPost.id,
      source: "admin_flag",
      status: "rejected",
      priority: "critical",
    });
    const secondApproveRecord = await moderationService.createModerationRecord({
      postId: stickyHiddenPost.id,
      source: "user_report",
    });

    const rejected = await moderationService.reviewModeration(
      rejectRecord.id,
      "admin-1",
      "rejected",
      "Confirmed violation",
    );
    const approved = await moderationService.reviewModeration(
      approveRecord.id,
      "admin-1",
      "approved",
      "False positive",
    );
    await moderationService.reviewModeration(
      secondApproveRecord.id,
      "admin-1",
      "approved",
      "Another record still rejects this post",
    );

    expect(rejected).not.toBeNull();
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.reviewedBy).toBe("admin-1");
    expect(rejected?.reviewNote).toBe("Confirmed violation");
    expect(rejected?.reviewedAt).toBeInstanceOf(Date);

    expect(approved?.status).toBe("approved");

    const [rejectedPostRow] = await databaseService.db
      .select({ hidden: posts.hidden })
      .from(posts)
      .where(eq(posts.id, rejectPost.id));
    const [approvedPostRow] = await databaseService.db
      .select({ hidden: posts.hidden })
      .from(posts)
      .where(eq(posts.id, approvePost.id));
    const [stickyHiddenRow] = await databaseService.db
      .select({ hidden: posts.hidden })
      .from(posts)
      .where(eq(posts.id, stickyHiddenPost.id));

    expect(rejectedPostRow.hidden).toBe(true);
    expect(approvedPostRow.hidden).toBe(false);
    expect(stickyHiddenRow.hidden).toBe(true);
  });

  it("creates critical flags that hide the post and link a moderation record", async () => {
    const post = await createPost("author-1", "Flag me");

    const flag = await moderationService.createFlag({
      postId: post.id,
      flaggedBy: "admin-1",
      priority: "critical",
      reason: "Immediate risk",
    });

    expect(flag.postId).toBe(post.id);
    expect(flag.priority).toBe("critical");
    expect(flag.reason).toBe("Immediate risk");
    expect(flag.moderationId).toBeTruthy();

    const [flagRow] = await databaseService.db
      .select()
      .from(postFlags)
      .where(eq(postFlags.id, flag.id));
    const [moderationRow] = await databaseService.db
      .select()
      .from(postModeration)
      .where(eq(postModeration.id, flag.moderationId!));
    const [postRow] = await databaseService.db
      .select({ hidden: posts.hidden })
      .from(posts)
      .where(eq(posts.id, post.id));

    expect(flagRow.moderationId).toBe(flag.moderationId);
    expect(moderationRow).toMatchObject({
      postId: post.id,
      source: "admin_flag",
      status: "rejected",
      priority: "critical",
    });
    expect(postRow.hidden).toBe(true);
  });

  it("creates reports and lists them with reporter details", async () => {
    const post = await createPost("author-1", "Reported content");
    const moderation = await moderationService.createModerationRecord({
      postId: post.id,
      source: "user_report",
      status: "pending",
    });

    const report = await moderationService.createReport({
      postId: post.id,
      reporterId: "reporter-1",
      reason: "spam",
      description: "This looks mass-posted.",
      passedHeuristic: true,
      moderationId: moderation.id,
    });
    await moderationService.createReport({
      postId: post.id,
      reporterId: "reporter-1",
      reason: "other",
      description: null,
      passedHeuristic: false,
    });

    const listed = await moderationService.listReports({
      page: 0,
      pageSize: 10,
    });

    expect(report.moderationId).toBe(moderation.id);
    expect(listed.total).toBe(2);
    expect(listed.items).toHaveLength(2);
    expect(listed.items[0]).toMatchObject({
      postId: post.id,
      reporterId: "reporter-1",
      reporter: {
        id: "reporter-1",
        username: "reporter-one",
        name: "Reporter One",
      },
    });
    expect(
      listed.items.some(
        (item) =>
          item.reason === "spam" &&
          item.description === "This looks mass-posted." &&
          item.moderationId === moderation.id,
      ),
    ).toBe(true);
  });

  it("updates content hashes and reports post existence and text", async () => {
    const post = await createPost("author-1", "Hashable content");

    expect(await moderationService.postExists(post.id)).toBe(true);
    expect(await moderationService.postExists(randomUUID())).toBe(false);
    expect(await moderationService.getPostText(post.id)).toBe(
      "Hashable content",
    );
    expect(await moderationService.getPostText(randomUUID())).toBeNull();

    await moderationService.updateContentHash(post.id, "sha-256-hash");

    const [row] = await databaseService.db
      .select({ contentHash: posts.contentHash })
      .from(posts)
      .where(eq(posts.id, post.id));

    expect(row.contentHash).toBe("sha-256-hash");
  });
});
