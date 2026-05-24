import { Injectable, Logger } from "@nestjs/common";
import { eq, desc, sql, and, count } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import {
  postModeration,
  postReactions,
  postReports,
  postFlags,
  posts,
  comments,
  usersView,
  type PostModeration as PostModerationRow,
} from "@/db/schema";

import type {
  ModerationStatusDto,
  ModerationSourceDto,
  FlagPriorityDto,
  ReportReasonDto,
} from "@repo/shared-dto";
import type {
  ModerationValidationGraphType,
  ModerationValidationPipelineType,
  ModerationValidationStepStatusType,
} from "@repo/rest-contracts";

type ValidationNodeInput = {
  id: string;
  label: string;
  pipeline: ModerationValidationPipelineType;
  status: ModerationValidationStepStatusType;
  message?: string | null;
  detail?: string | null;
  x: number;
  y: number;
};

// Aggregation helpers (same as posts.service.ts)
const upvoteCount = count(
  sql`CASE WHEN ${postReactions.type} = 'upvote' THEN 1 END`,
).as("upvoteCount");
const downvoteCount = count(
  sql`CASE WHEN ${postReactions.type} = 'downvote' THEN 1 END`,
).as("downvoteCount");
const commentCount =
  sql<number>`(SELECT count(*)::int FROM ${comments} WHERE ${comments.postId} = ${posts.id})`.as(
    "commentCount",
  );

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  private validationNode(input: ValidationNodeInput) {
    return {
      id: input.id,
      type: "validationStep",
      position: { x: input.x, y: input.y },
      data: {
        label: input.label,
        pipeline: input.pipeline,
        status: input.status,
        message: input.message ?? null,
        detail: input.detail ?? null,
      },
    };
  }

  private describeModerationRecord(record: PostModerationRow | undefined) {
    if (!record) return null;

    const confidence = record.llmConfidence
      ? `Confidence: ${record.llmConfidence}`
      : null;
    const summary = record.llmSummary ?? null;

    return [summary, confidence].filter(Boolean).join("\n") || null;
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
        postUpdatedAt: posts.updatedAt,
        postHidden: posts.hidden,
        // Joined author info
        authorUsername: usersView.username,
        authorName: usersView.name,
        authorImage: usersView.image,
        authorEmail: usersView.email,
        // Aggregated counts
        upvoteCount,
        downvoteCount,
        commentCount,
      })
      .from(postModeration)
      .leftJoin(posts, eq(postModeration.postId, posts.id))
      .leftJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(whereClause)
      .groupBy(
        postModeration.id,
        posts.id,
        posts.content,
        posts.authorId,
        posts.createdAt,
        posts.updatedAt,
        posts.hidden,
        usersView.id,
        usersView.username,
        usersView.name,
        usersView.image,
        usersView.email,
      )
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
            updatedAt: item.postUpdatedAt?.toISOString(),
            upvoteCount: item.upvoteCount,
            downvoteCount: item.downvoteCount,
            commentCount: item.commentCount,
            currentUserReaction: null,
            currentUserSubscribed: false,
            currentUserBookmarked: false,
            currentUserBookmark: null,
            hidden: item.postHidden,
            author: {
              id: item.postAuthorId,
              username: item.authorUsername,
              email: item.authorEmail,
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
        postUpdatedAt: posts.updatedAt,
        postHidden: posts.hidden,
        authorUsername: usersView.username,
        authorName: usersView.name,
        authorImage: usersView.image,
        authorEmail: usersView.email,
        upvoteCount,
        downvoteCount,
        commentCount,
      })
      .from(postModeration)
      .leftJoin(posts, eq(postModeration.postId, posts.id))
      .leftJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(eq(postModeration.id, id))
      .groupBy(
        postModeration.id,
        posts.id,
        posts.content,
        posts.authorId,
        posts.createdAt,
        posts.updatedAt,
        posts.hidden,
        usersView.id,
        usersView.username,
        usersView.name,
        usersView.image,
        usersView.email,
      )
      .limit(1);

    if (!record) return null;

    return {
      id: record.id,
      postId: record.postId,
      source: record.source,
      status: record.status,
      priority: record.priority,
      llmConfidence: record.llmConfidence,
      llmSummary: record.llmSummary,
      similarPostId: record.similarPostId,
      similarityScore: record.similarityScore,
      moderationResult: record.moderationResult,
      reviewedBy: record.reviewedBy,
      reviewedAt: record.reviewedAt?.toISOString() ?? null,
      reviewNote: record.reviewNote,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      post: record.postContent
        ? {
            id: record.postId,
            authorId: record.postAuthorId,
            content: record.postContent,
            createdAt: record.postCreatedAt?.toISOString(),
            updatedAt: record.postUpdatedAt?.toISOString(),
            upvoteCount: record.upvoteCount,
            downvoteCount: record.downvoteCount,
            commentCount: record.commentCount,
            currentUserReaction: null,
            currentUserSubscribed: false,
            currentUserBookmarked: false,
            currentUserBookmark: null,
            hidden: record.postHidden,
            author: {
              id: record.postAuthorId,
              username: record.authorUsername,
              email: record.authorEmail,
              name: record.authorName,
              image: record.authorImage,
            },
          }
        : undefined,
    };
  }

  async getPostValidationStatus(
    postId: string,
  ): Promise<ModerationValidationGraphType | null> {
    const [post] = await this.db
      .select({ id: posts.id, hidden: posts.hidden })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) return null;

    const moderationRecords = await this.db
      .select()
      .from(postModeration)
      .where(eq(postModeration.postId, postId))
      .orderBy(desc(postModeration.createdAt));

    const reports = await this.db
      .select()
      .from(postReports)
      .where(eq(postReports.postId, postId))
      .orderBy(desc(postReports.createdAt));

    const duplicateRecord = moderationRecords.find(
      (record) => record.source === "auto_duplicate",
    );
    const harmfulRecord = moderationRecords.find(
      (record) => record.source === "auto_harmful",
    );
    const reportRecord = moderationRecords.find(
      (record) => record.source === "user_report",
    );
    const needsHumanReview = moderationRecords.some(
      (record) => record.status === "needs_human_review",
    );
    const rejected = moderationRecords.some(
      (record) => record.status === "rejected",
    );
    const allReviewed =
      moderationRecords.length > 0 &&
      moderationRecords.every((record) => record.reviewedAt !== null);

    const validReports = reports.filter((report) => report.passedHeuristic);
    const gibberishReports = reports.filter((report) => !report.passedHeuristic);

    const duplicateDetail = this.describeModerationRecord(duplicateRecord);
    const harmfulDetail = this.describeModerationRecord(harmfulRecord);
    const reportDetail = this.describeModerationRecord(reportRecord);

    const duplicateByHash = duplicateRecord?.similarityScore === "1";
    const duplicateConfidence = duplicateRecord?.llmConfidence
      ? Number(duplicateRecord.llmConfidence)
      : null;
    const harmfulConfidence = harmfulRecord?.llmConfidence
      ? Number(harmfulRecord.llmConfidence)
      : null;
    const reportConfidence = reportRecord?.llmConfidence
      ? Number(reportRecord.llmConfidence)
      : null;

    const nodes = [
      this.validationNode({
        id: "post-created",
        label: "Post created",
        pipeline: "decision",
        status: "passed",
        message: post.hidden ? "Post is currently hidden" : "Post is visible",
        x: 0,
        y: 120,
      }),
      this.validationNode({
        id: "duplicate-hash",
        label: "Verify content hash",
        pipeline: "duplication",
        status: duplicateByHash ? "blocked" : "passed",
        message: duplicateByHash
          ? "Exact duplicate content hash matched"
          : "No exact duplicate hash block",
        detail: duplicateByHash ? duplicateDetail : null,
        x: 260,
        y: 0,
      }),
      this.validationNode({
        id: "duplicate-embedding",
        label: "Verify by embedding",
        pipeline: "duplication",
        status:
          duplicateRecord && !duplicateByHash
            ? "blocked"
            : duplicateByHash
              ? "not_run"
              : "passed",
        message:
          duplicateRecord && !duplicateByHash
            ? `Similar post: ${duplicateRecord.similarPostId ?? "unknown"}`
            : duplicateByHash
              ? "Skipped after exact hash match"
              : "No embedding similarity block",
        detail:
          duplicateRecord && !duplicateByHash
            ? `Similarity score: ${duplicateRecord.similarityScore ?? "unknown"}`
            : null,
        x: 520,
        y: 0,
      }),
      this.validationNode({
        id: "duplicate-llm",
        label: "Cheap LLM duplicate validation",
        pipeline: "duplication",
        status: duplicateRecord
          ? duplicateRecord.status === "needs_human_review"
            ? "needs_human_review"
            : "blocked"
          : "not_run",
        message: duplicateRecord
          ? `LLM confidence: ${duplicateConfidence ?? "not available"}`
          : "No duplicate flag required LLM validation",
        detail: duplicateDetail,
        x: 780,
        y: 0,
      }),
      this.validationNode({
        id: "harmful-openai",
        label: "OpenAI omni-moderation",
        pipeline: "harmful_content",
        status: harmfulRecord ? "blocked" : "passed",
        message: harmfulRecord
          ? "OpenAI moderation flagged this post"
          : "No harmful-content block",
        detail: harmfulRecord
          ? JSON.stringify(harmfulRecord.moderationResult, null, 2)
          : null,
        x: 260,
        y: 160,
      }),
      this.validationNode({
        id: "harmful-llm",
        label: "Cheap LLM harmful validation",
        pipeline: "harmful_content",
        status: harmfulRecord
          ? harmfulRecord.status === "needs_human_review"
            ? "needs_human_review"
            : "blocked"
          : "not_run",
        message: harmfulRecord
          ? `LLM confidence: ${harmfulConfidence ?? "not available"}`
          : "No harmful-content flag required LLM validation",
        detail: harmfulDetail,
        x: 520,
        y: 160,
      }),
      this.validationNode({
        id: "report-heuristic",
        label: "User report heuristic",
        pipeline: "user_report",
        status:
          reports.length === 0
            ? "not_run"
            : validReports.length > 0
              ? "passed"
              : "blocked",
        message:
          reports.length === 0
            ? "No user reports submitted"
            : `${validReports.length} valid report(s), ${gibberishReports.length} gibberish report(s)`,
        detail:
          gibberishReports.length > 0
            ? "Gibberish reports are saved but do not escalate."
            : null,
        x: 260,
        y: 320,
      }),
      this.validationNode({
        id: "report-llm",
        label: "Cheap LLM report validation",
        pipeline: "user_report",
        status: reportRecord
          ? reportRecord.status === "needs_human_review"
            ? "needs_human_review"
            : reportRecord.status === "pending"
              ? "pending"
              : "blocked"
          : validReports.length > 0
            ? "pending"
            : "not_run",
        message: reportRecord
          ? `LLM confidence: ${reportConfidence ?? "not available"}`
          : validReports.length > 0
            ? "A valid report exists without a linked moderation record"
            : "No valid report required LLM validation",
        detail: reportDetail,
        x: 520,
        y: 320,
      }),
      this.validationNode({
        id: "human-review",
        label: "Human review",
        pipeline: "decision",
        status: needsHumanReview
          ? "needs_human_review"
          : allReviewed
            ? "passed"
            : "not_run",
        message: needsHumanReview
          ? "At least one moderation branch needs human intervention"
          : allReviewed
            ? "Moderation records have been reviewed"
            : "No human review is currently required",
        x: 1040,
        y: 160,
      }),
      this.validationNode({
        id: "final-decision",
        label: "Current post status",
        pipeline: "decision",
        status: rejected ? "blocked" : post.hidden ? "blocked" : "passed",
        message: post.hidden ? "Post is hidden" : "Post is visible",
        detail: rejected
          ? "A moderation record rejected this post."
          : "No rejected moderation record is currently active.",
        x: 1300,
        y: 160,
      }),
    ];

    return {
      postId,
      generatedAt: new Date().toISOString(),
      nodes,
      edges: [
        { id: "post-duplicate-hash", source: "post-created", target: "duplicate-hash" },
        { id: "duplicate-hash-embedding", source: "duplicate-hash", target: "duplicate-embedding" },
        { id: "duplicate-embedding-llm", source: "duplicate-embedding", target: "duplicate-llm" },
        { id: "duplicate-llm-human", source: "duplicate-llm", target: "human-review" },
        { id: "post-harmful-openai", source: "post-created", target: "harmful-openai" },
        { id: "harmful-openai-llm", source: "harmful-openai", target: "harmful-llm" },
        { id: "harmful-llm-human", source: "harmful-llm", target: "human-review" },
        { id: "post-report-heuristic", source: "post-created", target: "report-heuristic" },
        { id: "report-heuristic-llm", source: "report-heuristic", target: "report-llm" },
        { id: "report-llm-human", source: "report-llm", target: "human-review" },
        { id: "human-final", source: "human-review", target: "final-decision" },
      ],
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
        reporterEmail: usersView.email,
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
        email: item.reporterEmail,
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
