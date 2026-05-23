import { Injectable, Logger } from "@nestjs/common";
import { eq, desc, sql, and, count } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import {
  postModeration,
  postReports,
  postFlags,
  posts,
  usersView,
  type PostModeration as PostModerationRow,
} from "@/db/schema";

import type {
  ModerationStatusDto,
  ModerationSourceDto,
  FlagPriorityDto,
  ReportReasonDto,
} from "@repo/shared-dto";

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  // ─── Moderation Records ────────────────────────────────────────────────

  async createModerationRecord(input: {
    postId: string;
    source: ModerationSourceDto;
    status?: ModerationStatusDto;
    priority?: FlagPriorityDto;
    llmConfidence?: number | null;
    llmSummary?: string | null;
    similarPostId?: string | null;
    similarityScore?: number | null;
    moderationResult?: unknown | null;
  }): Promise<PostModerationRow> {
    const [record] = await this.db
      .insert(postModeration)
      .values({
        postId: input.postId,
        source: input.source,
        status: input.status ?? "pending",
        priority: input.priority ?? "medium",
        llmConfidence: input.llmConfidence?.toString() ?? null,
        llmSummary: input.llmSummary ?? null,
        similarPostId: input.similarPostId ?? null,
        similarityScore: input.similarityScore?.toString() ?? null,
        moderationResult: input.moderationResult ?? null,
      })
      .returning();

    return record;
  }

  async listModerationRecords(filters: {
    status?: ModerationStatusDto;
    source?: ModerationSourceDto;
    priority?: FlagPriorityDto;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 0;
    const pageSize = filters.pageSize ?? 20;
    const offset = page * pageSize;

    const conditions: any[] = [];
    if (filters.status) {
      conditions.push(eq(postModeration.status, filters.status));
    }
    if (filters.source) {
      conditions.push(eq(postModeration.source, filters.source));
    }
    if (filters.priority) {
      conditions.push(eq(postModeration.priority, filters.priority));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total: totalCount }] = await this.db
      .select({ total: count() })
      .from(postModeration)
      .where(whereClause);

    // Get paginated items with joined post data
    const items = await this.db
      .select({
        id: postModeration.id,
        postId: postModeration.postId,
        source: postModeration.source,
        status: postModeration.status,
        priority: postModeration.priority,
        llmConfidence: postModeration.llmConfidence,
        llmSummary: postModeration.llmSummary,
        similarPostId: postModeration.similarPostId,
        similarityScore: postModeration.similarityScore,
        moderationResult: postModeration.moderationResult,
        reviewedBy: postModeration.reviewedBy,
        reviewedAt: postModeration.reviewedAt,
        reviewNote: postModeration.reviewNote,
        createdAt: postModeration.createdAt,
        updatedAt: postModeration.updatedAt,
        // Joined post info
        postContent: posts.content,
        postAuthorId: posts.authorId,
        postCreatedAt: posts.createdAt,
        postHidden: posts.hidden,
        // Joined author info
        authorUsername: usersView.username,
        authorName: usersView.name,
        authorImage: usersView.image,
        authorEmail: usersView.email,
      })
      .from(postModeration)
      .leftJoin(posts, eq(postModeration.postId, posts.id))
      .leftJoin(usersView, eq(posts.authorId, usersView.id))
      .where(whereClause)
      .orderBy(desc(postModeration.createdAt))
      .limit(pageSize)
      .offset(offset);

    const mappedItems = items.map((item) => ({
      id: item.id,
      postId: item.postId,
      source: item.source,
      status: item.status,
      priority: item.priority,
      llmConfidence: item.llmConfidence,
      llmSummary: item.llmSummary,
      similarPostId: item.similarPostId,
      similarityScore: item.similarityScore,
      moderationResult: item.moderationResult,
      reviewedBy: item.reviewedBy,
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      reviewNote: item.reviewNote,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      post: item.postContent
        ? {
            id: item.postId,
            authorId: item.postAuthorId,
            content: item.postContent,
            createdAt: item.postCreatedAt?.toISOString(),
            hidden: item.postHidden,
            author: {
              id: item.postAuthorId,
              username: item.authorUsername,
              name: item.authorName,
              image: item.authorImage,
            },
          }
        : undefined,
    }));

    return {
      items: mappedItems,
      total: Number(totalCount),
      page,
      pageSize,
    };
  }

  async getModerationRecord(id: string): Promise<any | null> {
    const [record] = await this.db
      .select({
        id: postModeration.id,
        postId: postModeration.postId,
        source: postModeration.source,
        status: postModeration.status,
        priority: postModeration.priority,
        llmConfidence: postModeration.llmConfidence,
        llmSummary: postModeration.llmSummary,
        similarPostId: postModeration.similarPostId,
        similarityScore: postModeration.similarityScore,
        moderationResult: postModeration.moderationResult,
        reviewedBy: postModeration.reviewedBy,
        reviewedAt: postModeration.reviewedAt,
        reviewNote: postModeration.reviewNote,
        createdAt: postModeration.createdAt,
        updatedAt: postModeration.updatedAt,
        postContent: posts.content,
        postAuthorId: posts.authorId,
        postCreatedAt: posts.createdAt,
        postHidden: posts.hidden,
        authorUsername: usersView.username,
        authorName: usersView.name,
        authorImage: usersView.image,
      })
      .from(postModeration)
      .leftJoin(posts, eq(postModeration.postId, posts.id))
      .leftJoin(usersView, eq(posts.authorId, usersView.id))
      .where(eq(postModeration.id, id))
      .limit(1);

    if (!record) return null;

    return {
      ...record,
      reviewedAt: record.reviewedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      post: record.postContent
        ? {
            id: record.postId,
            authorId: record.postAuthorId,
            content: record.postContent,
            createdAt: record.postCreatedAt?.toISOString(),
            hidden: record.postHidden,
            author: {
              id: record.postAuthorId,
              username: record.authorUsername,
              name: record.authorName,
              image: record.authorImage,
            },
          }
        : undefined,
    };
  }

  async reviewModeration(
    id: string,
    reviewedBy: string,
    status: "approved" | "rejected",
    reviewNote?: string,
  ): Promise<PostModerationRow | null> {
    const [record] = await this.db
      .update(postModeration)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(postModeration.id, id))
      .returning();

    if (!record) return null;

    // If rejected, hide the post; if approved, unhide it
    if (status === "rejected") {
      await this.hidePost(record.postId);
    } else if (status === "approved") {
      // Only unhide if no other active (pending/rejected) moderation records exist
      const [otherActive] = await this.db
        .select({ id: postModeration.id })
        .from(postModeration)
        .where(
          and(
            eq(postModeration.postId, record.postId),
            eq(postModeration.status, "rejected"),
          ),
        )
        .limit(1);

      if (!otherActive) {
        await this.unhidePost(record.postId);
      }
    }

    return record;
  }

  // ─── Post Visibility ──────────────────────────────────────────────────

  async hidePost(postId: string): Promise<void> {
    await this.db
      .update(posts)
      .set({ hidden: true })
      .where(eq(posts.id, postId));
  }

  async unhidePost(postId: string): Promise<void> {
    await this.db
      .update(posts)
      .set({ hidden: false })
      .where(eq(posts.id, postId));
  }

  // ─── Flags ────────────────────────────────────────────────────────────

  async createFlag(input: {
    postId: string;
    flaggedBy: string;
    priority: FlagPriorityDto;
    reason?: string;
  }) {
    // Create flag record
    const [flag] = await this.db
      .insert(postFlags)
      .values({
        postId: input.postId,
        flaggedBy: input.flaggedBy,
        priority: input.priority,
        reason: input.reason ?? null,
      })
      .returning();

    // Create moderation record
    const moderationRecord = await this.createModerationRecord({
      postId: input.postId,
      source: "admin_flag",
      priority: input.priority,
      status:
        input.priority === "critical" ? "rejected" : "needs_human_review",
    });

    // Link flag to moderation record
    await this.db
      .update(postFlags)
      .set({ moderationId: moderationRecord.id })
      .where(eq(postFlags.id, flag.id));

    // Critical priority instantly hides the post
    if (input.priority === "critical") {
      await this.hidePost(input.postId);
    }

    return { ...flag, moderationId: moderationRecord.id };
  }

  // ─── Reports ──────────────────────────────────────────────────────────

  async createReport(input: {
    postId: string;
    reporterId: string;
    reason: ReportReasonDto;
    description?: string | null;
    passedHeuristic: boolean;
    moderationId?: string | null;
  }) {
    const [report] = await this.db
      .insert(postReports)
      .values({
        postId: input.postId,
        reporterId: input.reporterId,
        reason: input.reason,
        description: input.description ?? null,
        passedHeuristic: input.passedHeuristic,
        moderationId: input.moderationId ?? null,
      })
      .returning();

    return report;
  }

  async listReports(filters: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 0;
    const pageSize = filters.pageSize ?? 20;
    const offset = page * pageSize;

    const [{ total: totalCount }] = await this.db
      .select({ total: count() })
      .from(postReports);

    const items = await this.db
      .select({
        id: postReports.id,
        postId: postReports.postId,
        reporterId: postReports.reporterId,
        reason: postReports.reason,
        description: postReports.description,
        passedHeuristic: postReports.passedHeuristic,
        moderationId: postReports.moderationId,
        createdAt: postReports.createdAt,
        reporterUsername: usersView.username,
        reporterName: usersView.name,
        reporterImage: usersView.image,
      })
      .from(postReports)
      .leftJoin(usersView, eq(postReports.reporterId, usersView.id))
      .orderBy(desc(postReports.createdAt))
      .limit(pageSize)
      .offset(offset);

    const mappedItems = items.map((item) => ({
      id: item.id,
      postId: item.postId,
      reporterId: item.reporterId,
      reason: item.reason,
      description: item.description,
      passedHeuristic: item.passedHeuristic,
      moderationId: item.moderationId,
      createdAt: item.createdAt.toISOString(),
      reporter: {
        id: item.reporterId,
        username: item.reporterUsername,
        name: item.reporterName,
        image: item.reporterImage,
      },
    }));

    return {
      items: mappedItems,
      total: Number(totalCount),
      page,
      pageSize,
    };
  }

  // ─── Content Hash ─────────────────────────────────────────────────────

  async updateContentHash(postId: string, hash: string | null): Promise<void> {
    await this.db
      .update(posts)
      .set({ contentHash: hash })
      .where(eq(posts.id, postId));
  }

  // ─── Post exists check ────────────────────────────────────────────────

  async postExists(postId: string): Promise<boolean> {
    const [post] = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    return !!post;
  }

  async getPostText(postId: string): Promise<string | null> {
    const [post] = await this.db
      .select({ content: posts.content })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) return null;
    const content = post.content as any;
    return content?.text ?? null;
  }
}
