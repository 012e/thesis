import { Injectable } from "@nestjs/common";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import type { PostContentDto } from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import { analyticsEvents, posts, usersView } from "@/db/schema";

const IMPORTANT_EVENT_TYPES = [
  "post_view",
  "post_like",
  "post_unlike",
  "post_bookmark",
  "post_unbookmark",
  "comment_create",
  "comment_like",
  "post_share",
  "post_create",
  "poll_vote",
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface IngestEventInput {
  userId: string;
  type: string;
  metadata?: Record<string, unknown> | null;
  clientTimestamp: Date;
}

export interface AnalyticsEventDto {
  id: string;
  userId: string;
  type: string;
  metadata: Record<string, unknown> | null;
  clientTimestamp: string;
  createdAt: string;
  post: AnalyticsEventPostDto | null;
}

export interface AnalyticsEventPostDto {
  id: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
  contentPreview: string;
  imageUrl: string | null;
  createdAt: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Ingest a batch of analytics events for a user.
   * Returns the number of events successfully ingested.
   */
  async ingestBatch(events: IngestEventInput[]): Promise<number> {
    if (events.length === 0) return 0;

    const values = events.map((e) => ({
      userId: e.userId,
      type: e.type as typeof analyticsEvents.$inferInsert.type,
      metadata: e.metadata ?? null,
      clientTimestamp: e.clientTimestamp,
    }));

    const rows = await this.databaseService.db
      .insert(analyticsEvents)
      .values(values)
      .returning({ id: analyticsEvents.id });

    return rows.length;
  }

  /**
   * Get paginated analytics events for a specific user,
   * optionally filtered by event type.
   */
  async getEventsByUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      importantOnly?: boolean;
    } = {},
  ): Promise<{ items: AnalyticsEventDto[]; total: number }> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const conditions = [eq(analyticsEvents.userId, userId)];
    if (options.type) {
      conditions.push(
        eq(
          analyticsEvents.type,
          options.type as typeof analyticsEvents.$inferInsert.type,
        ),
      );
    } else if (options.importantOnly) {
      conditions.push(inArray(analyticsEvents.type, IMPORTANT_EVENT_TYPES));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await this.databaseService.db
      .select({ cnt: count() })
      .from(analyticsEvents)
      .where(whereClause);

    const rows = await this.databaseService.db
      .select()
      .from(analyticsEvents)
      .where(whereClause)
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit)
      .offset(offset);

    const postsById = await this.getPostSummaries(rows);

    return {
      items: rows.map((r) => this.toDto(r, postsById.get(this.getPostId(r.metadata)))),
      total: totalRow?.cnt ?? 0,
    };
  }

  private async getPostSummaries(rows: Array<typeof analyticsEvents.$inferSelect>) {
    const postIds = [
      ...new Set(
        rows
          .map((row) => this.getPostId(row.metadata))
          .filter((postId): postId is string => postId !== null),
      ),
    ];

    if (postIds.length === 0) {
      return new Map<string, AnalyticsEventPostDto>();
    }

    const postRows = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        authorName: usersView.name,
        authorUsername: usersView.username,
      })
      .from(posts)
      .leftJoin(usersView, eq(usersView.id, posts.authorId))
      .where(inArray(posts.id, postIds));

    return new Map(
      postRows.map((post) => [
        post.id,
        {
          id: post.id,
          authorId: post.authorId,
          authorName: post.authorName ?? null,
          authorUsername: post.authorUsername ?? null,
          contentPreview: this.getPostPreview(post.content),
          imageUrl: post.content.images?.[0]?.url ?? null,
          createdAt: post.createdAt.toISOString(),
        } satisfies AnalyticsEventPostDto,
      ]),
    );
  }

  private getPostId(metadata: Record<string, unknown> | null): string | null {
    return typeof metadata?.postId === "string" &&
      UUID_PATTERN.test(metadata.postId)
      ? metadata.postId
      : null;
  }

  private getPostPreview(content: PostContentDto): string {
    const preview =
      content.text ??
      content.poll?.question ??
      content.visualization?.title ??
      (content.images?.length ? "Image post" : "Post");

    return preview.length > 140 ? `${preview.slice(0, 137).trimEnd()}...` : preview;
  }

  private toDto(
    row: typeof analyticsEvents.$inferSelect,
    post?: AnalyticsEventPostDto,
  ): AnalyticsEventDto {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      metadata: row.metadata,
      clientTimestamp: row.clientTimestamp.toISOString(),
      createdAt: row.createdAt.toISOString(),
      post: post ?? null,
    };
  }
}
