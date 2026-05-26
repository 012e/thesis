import { Injectable } from "@nestjs/common";
import type { BookmarkSummaryDto, PostSubscriptionDto } from "@repo/shared-dto";
import { and, eq } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { postBookmarks, posts, postSubscriptions } from "@/db/schema";

@Injectable()
export class PostsEngagementService {
  constructor(private readonly databaseService: DatabaseService) {}

  async subscribe(
    postId: string,
    userId: string,
  ): Promise<PostSubscriptionDto | null> {
    const postExists = await this.postExists(postId);
    if (!postExists) return null;

    await this.databaseService.db
      .insert(postSubscriptions)
      .values({ postId, userId })
      .onConflictDoNothing();

    const [row] = await this.databaseService.db
      .select()
      .from(postSubscriptions)
      .where(
        and(
          eq(postSubscriptions.postId, postId),
          eq(postSubscriptions.userId, userId),
        ),
      )
      .limit(1);

    return row ? this.toSubscriptionDto(row) : null;
  }

  async unsubscribe(
    postId: string,
    userId: string,
  ): Promise<PostSubscriptionDto | null> {
    const [post] = await this.databaseService.db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) return null;

    const [row] = await this.databaseService.db
      .delete(postSubscriptions)
      .where(
        and(
          eq(postSubscriptions.postId, postId),
          eq(postSubscriptions.userId, userId),
        ),
      )
      .returning();

    return row ? this.toSubscriptionDto(row) : null;
  }

  async bookmark(
    postId: string,
    userId: string,
  ): Promise<BookmarkSummaryDto | null> {
    const postExists = await this.postExists(postId);
    if (!postExists) return null;

    await this.databaseService.db
      .insert(postBookmarks)
      .values({ postId, userId })
      .onConflictDoNothing();

    const [row] = await this.databaseService.db
      .select()
      .from(postBookmarks)
      .where(
        and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, userId)),
      )
      .limit(1);

    return row ? this.toBookmarkDto(row) : null;
  }

  async unbookmark(
    postId: string,
    userId: string,
  ): Promise<BookmarkSummaryDto | null> {
    const postExists = await this.postExists(postId);
    if (!postExists) return null;

    const [row] = await this.databaseService.db
      .delete(postBookmarks)
      .where(
        and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, userId)),
      )
      .returning();

    return row ? this.toBookmarkDto(row) : null;
  }

  private async postExists(postId: string): Promise<boolean> {
    const [row] = await this.databaseService.db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    return row !== undefined;
  }

  private readonly toSubscriptionDto = (row: {
    postId: string;
    userId: string;
    createdAt: Date;
  }): PostSubscriptionDto => ({
    postId: row.postId,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  });

  private readonly toBookmarkDto = (row: {
    postId: string;
    createdAt: Date;
  }): BookmarkSummaryDto => ({
    postId: row.postId,
    createdAt: row.createdAt.toISOString(),
  });
}
