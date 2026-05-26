import { Injectable, Logger } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  or,
  sql,
} from "drizzle-orm";
import type { PostDto, PostTagDto, ReactionTypeDto } from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import {
  comments,
  postBookmarks,
  postReactions,
  posts,
  postSubscriptions,
  postTags,
  tags,
  usersView,
} from "@/db/schema";
import { UsersService } from "@/users/users.service";

import { extractTags, type ParsedTag } from "./tag-parser";

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Tag Extraction Helpers ──────────────────────────────────────────────────

  /**
   * Sync tags for a post: extract tags from text, upsert tag entities,
   * replace post_tags relations, and update denormalized counts.
   */
  async syncPostTags(
    postId: string,
    authorId: string,
    text: string | undefined | null,
  ): Promise<PostTagDto[]> {
    const parsed = extractTags(text);

    return await this.db.db.transaction(async (tx) => {
      // Remove existing post_tags for this post
      await tx.delete(postTags).where(eq(postTags.postId, postId));

      if (parsed.length === 0) {
        return [];
      }

      // Upsert tags - use the first seen casing as display_name
      for (const tag of parsed) {
        await tx
          .insert(tags)
          .values({
            slug: tag.slug,
            displayName: tag.raw,
          })
          .onConflictDoUpdate({
            target: tags.slug,
            set: {
              updatedAt: new Date(),
            },
          });
      }

      // Get the tag IDs
      const slugs = parsed.map((t) => t.slug);
      const tagRows = await tx
        .select({ id: tags.id, slug: tags.slug, displayName: tags.displayName })
        .from(tags)
        .where(inArray(tags.slug, slugs));

      const tagMap = new Map(tagRows.map((t) => [t.slug, t]));

      // Insert post_tags relations
      const postTagValues = parsed
        .map((p) => {
          const tag = tagMap.get(p.slug);
          if (!tag) return null;
          return {
            postId,
            tagId: tag.id,
            authorId,
          };
        })
        .filter(Boolean) as {
        postId: string;
        tagId: string;
        authorId: string;
      }[];

      if (postTagValues.length > 0) {
        await tx.insert(postTags).values(postTagValues).onConflictDoNothing();
      }

      // Update denormalized post_count on tags
      await this.updateTagCounts(
        tx,
        tagRows.map((t) => t.id),
      );

      return tagRows.map((t) => ({
        id: t.id,
        slug: t.slug,
        displayName: t.displayName,
      }));
    });
  }

  /**
   * Update denormalized post_count for given tag IDs.
   * Counts only non-hidden posts.
   */
  private async updateTagCounts(tx: any, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    for (const tagId of tagIds) {
      const [result] = await tx
        .select({ count: count() })
        .from(postTags)
        .innerJoin(posts, eq(postTags.postId, posts.id))
        .where(and(eq(postTags.tagId, tagId), eq(posts.hidden, false)));

      await tx
        .update(tags)
        .set({
          postCount: result?.count ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(tags.id, tagId));
    }
  }

  /**
   * Batch-load tags for multiple posts at once.
   */
  async getTagsForPosts(postIds: string[]): Promise<Map<string, PostTagDto[]>> {
    if (postIds.length === 0) return new Map();

    const rows = await this.db.db
      .select({
        postId: postTags.postId,
        tagId: tags.id,
        slug: tags.slug,
        displayName: tags.displayName,
      })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(inArray(postTags.postId, postIds));

    const map = new Map<string, PostTagDto[]>();
    for (const row of rows) {
      const existing = map.get(row.postId) ?? [];
      existing.push({
        id: row.tagId,
        slug: row.slug,
        displayName: row.displayName,
      });
      map.set(row.postId, existing);
    }
    return map;
  }

  // ─── Tag Metadata ────────────────────────────────────────────────────────────

  async getTag(slug: string) {
    const normalized = slug.toLowerCase().normalize("NFC");
    const [row] = await this.db.db
      .select({
        id: tags.id,
        slug: tags.slug,
        displayName: tags.displayName,
        postCount: tags.postCount,
      })
      .from(tags)
      .where(eq(tags.slug, normalized))
      .limit(1);

    return row ?? null;
  }

  // ─── Tag Feed ────────────────────────────────────────────────────────────────

  // Shared select for post queries (same shape as PostsService)
  private postSelect(userId?: string) {
    const upvoteCount = count(
      sql`CASE WHEN ${postReactions.type} = 'upvote' THEN 1 END`,
    ).as("upvoteCount");
    const downvoteCount = count(
      sql`CASE WHEN ${postReactions.type} = 'downvote' THEN 1 END`,
    ).as("downvoteCount");
    const commentCount = sql<number>`(
      SELECT COUNT(*)::int FROM ${comments}
      WHERE ${comments.postId} = ${posts.id}
    )`.as("commentCount");

    const getUserReactionType = (uid: string) =>
      sql<string | null>`(
        SELECT ${postReactions.type} FROM ${postReactions}
        WHERE ${postReactions.postId} = ${posts.id}
          AND ${postReactions.userId} = ${uid}
        LIMIT 1
      )`.as("userReactionType");

    const getCurrentUserSubscribed = (uid: string) =>
      sql<boolean>`EXISTS(
        SELECT 1 FROM ${postSubscriptions}
        WHERE ${postSubscriptions.postId} = ${posts.id}
          AND ${postSubscriptions.userId} = ${uid}
      )`.as("currentUserSubscribed");

    const getCurrentUserBookmarked = (uid: string) =>
      sql<boolean>`EXISTS(
        SELECT 1 FROM ${postBookmarks}
        WHERE ${postBookmarks.postId} = ${posts.id}
          AND ${postBookmarks.userId} = ${uid}
      )`.as("currentUserBookmarked");

    return {
      id: posts.id,
      authorId: posts.authorId,
      content: posts.content,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      author: {
        id: usersView.id,
        username: usersView.username,
        email: usersView.email,
        name: usersView.name,
        image: usersView.image,
      },
      upvoteCount,
      downvoteCount,
      commentCount,
      userReactionType: userId
        ? getUserReactionType(userId)
        : sql<string | null>`NULL`.as("userReactionType"),
      currentUserSubscribed: userId
        ? getCurrentUserSubscribed(userId)
        : sql<boolean>`false`.as("currentUserSubscribed"),
      currentUserBookmarked: userId
        ? getCurrentUserBookmarked(userId)
        : sql<boolean>`false`.as("currentUserBookmarked"),
    };
  }

  async listPostsByTag(
    slug: string,
    userId: string | undefined,
    sort: "top" | "latest" = "top",
    limit: number = 20,
    cursor?: string,
  ): Promise<{ items: PostDto[]; nextCursor: string | null } | null> {
    const normalized = slug.toLowerCase().normalize("NFC");

    // Verify tag exists
    const tag = await this.getTag(normalized);
    if (!tag) return null;

    const select = this.postSelect(userId);
    const parsed = cursor ? this.decodeCursor(cursor) : null;

    let query = this.db.db
      .select({
        ...select,
        tagCreatedAt: postTags.createdAt,
      })
      .from(posts)
      .innerJoin(postTags, eq(posts.id, postTags.postId))
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(and(eq(postTags.tagId, tag.id), eq(posts.hidden, false)))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
        postTags.createdAt,
      )
      .$dynamic();

    if (sort === "latest") {
      if (parsed) {
        query = query.where(
          and(
            eq(postTags.tagId, tag.id),
            eq(posts.hidden, false),
            or(
              lt(postTags.createdAt, new Date(parsed.createdAt)),
              and(
                eq(postTags.createdAt, new Date(parsed.createdAt)),
                gt(posts.id, parsed.postId),
              ),
            ),
          ),
        );
      }
      query = query
        .orderBy(desc(postTags.createdAt), asc(posts.id))
        .limit(limit + 1);
    } else {
      // "top" sort — simple: order by upvotes desc, then createdAt desc
      query = query
        .orderBy(
          desc(select.upvoteCount),
          desc(postTags.createdAt),
          asc(posts.id),
        )
        .limit(limit + 1);

      if (parsed) {
        // For top sort, just use offset-style with cursor as page number
        // But keyset is cleaner — use createdAt cursor for simplicity
        query = query.where(
          and(
            eq(postTags.tagId, tag.id),
            eq(posts.hidden, false),
            or(
              lt(postTags.createdAt, new Date(parsed.createdAt)),
              and(
                eq(postTags.createdAt, new Date(parsed.createdAt)),
                gt(posts.id, parsed.postId),
              ),
            ),
          ),
        );
      }
    }

    const rows = await query;

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = items.at(-1);
    const nextCursor =
      hasMore && lastItem
        ? this.encodeCursor({
            createdAt: lastItem.tagCreatedAt.toISOString(),
            postId: lastItem.id,
          })
        : null;

    // Batch-load tags for results
    const postIds = items.map((r) => r.id);
    const tagsMap = await this.getTagsForPosts(postIds);

    return {
      items: items.map((row) =>
        this.toDto(
          row,
          row.userReactionType as ReactionTypeDto | null,
          tagsMap.get(row.id) ?? [],
        ),
      ),
      nextCursor,
    };
  }

  // ─── Trending ────────────────────────────────────────────────────────────────

  async getTrendingTags(limit: number = 10, windowHours: number = 24) {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const recentCount = count().as("recentCount");

    const rows = await this.db.db
      .select({
        id: tags.id,
        slug: tags.slug,
        displayName: tags.displayName,
        postCount: tags.postCount,
        recentCount,
      })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .where(and(gte(postTags.createdAt, since), eq(posts.hidden, false)))
      .groupBy(tags.id, tags.slug, tags.displayName, tags.postCount)
      .orderBy(desc(recentCount), desc(sql`MAX(${postTags.createdAt})`))
      .limit(limit);

    return { items: rows };
  }

  // ─── Suggest Tags ────────────────────────────────────────────────────────────

  async suggestTags(query: string, limit: number = 10) {
    const normalized = query.toLowerCase().normalize("NFC");

    const rows = await this.db.db
      .select({
        id: tags.id,
        slug: tags.slug,
        displayName: tags.displayName,
        postCount: tags.postCount,
      })
      .from(tags)
      .where(ilike(tags.slug, `${normalized}%`))
      .orderBy(desc(tags.postCount), asc(tags.slug))
      .limit(limit);

    return { items: rows };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private toDto(
    row: any,
    userReactionType: ReactionTypeDto | null,
    postTagDtos: PostTagDto[] = [],
  ): PostDto {
    return {
      id: row.id,
      authorId: row.authorId,
      author: {
        id: row.author.id,
        username: row.author.username ?? null,
        email: row.author.email,
        name: row.author.name ?? null,
        image: this.usersService.resolveAvatarUrl(row.author.image ?? null),
      },
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      upvoteCount: row.upvoteCount,
      downvoteCount: row.downvoteCount,
      commentCount: row.commentCount,
      currentUserReaction: userReactionType ?? null,
      currentUserSubscribed: row.currentUserSubscribed ?? false,
      currentUserBookmarked: row.currentUserBookmarked ?? false,
      tags: postTagDtos,
    };
  }

  private encodeCursor(cursor: { createdAt: string; postId: string }): string {
    return Buffer.from(JSON.stringify(cursor)).toString("base64url");
  }

  private decodeCursor(cursor: string): {
    createdAt: string;
    postId: string;
  } | null {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      ) as unknown;
      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "createdAt" in decoded &&
        "postId" in decoded &&
        typeof (decoded as { createdAt: unknown }).createdAt === "string" &&
        typeof (decoded as { postId: unknown }).postId === "string"
      ) {
        return decoded as { createdAt: string; postId: string };
      }
      return null;
    } catch {
      return null;
    }
  }
}
