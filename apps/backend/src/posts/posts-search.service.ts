import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { PostDto, ReactionTypeDto } from "@repo/shared-dto";
import { toSql } from "pgvector";

import { DatabaseService } from "@/db/database.service";
import {
  EMBEDDING_SERVICE,
  type IEmbeddingService,
} from "@/embedding/embedding.interface";
import { UsersService } from "@/users/users.service";

import { PostsService } from "./posts.service";

/**
 * Handles post search using hybrid BM25 + vector similarity (Reciprocal Rank Fusion).
 *
 * BM25 (ParadeDB) handles keyword relevance.
 * Vector cosine similarity handles semantic relevance via OpenAI embeddings.
 * The two ranked lists are fused with RRF (k=60):
 *   score = 1/(60 + bm25_rank) + 1/(60 + vector_rank)
 *
 * ParadeDB's @@@ operator cannot be used inside JOINs, so BM25 results are
 * collected in a standalone CTE before being joined with the rest of the query.
 */
@Injectable()
export class PostsSearchService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersService: UsersService,
    private readonly postsService: PostsService,
    @Inject(EMBEDDING_SERVICE)
    private readonly embeddingService: IEmbeddingService,
  ) {}

  async search(query: string, userId: string): Promise<PostDto[]> {
    const queryEmbedding = await this.embeddingService.embed(query);
    const queryVector = toSql(queryEmbedding);

    const result = await this.databaseService.db.execute(sql`
      WITH bm25 AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY paradedb.score(id) DESC) AS bm25_rank
        FROM posts
        WHERE hidden = false
          AND id @@@ paradedb.match('content.text', ${query})
        LIMIT 50
      ),
      vec AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> ${queryVector}::vector ASC) AS vec_rank
        FROM posts
        WHERE hidden = false
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${queryVector}::vector
        LIMIT 50
      ),
      rrf AS (
        SELECT
          COALESCE(bm25.id, vec.id) AS id,
          (COALESCE(1.0 / (60 + bm25.bm25_rank), 0) +
           COALESCE(1.0 / (60 + vec.vec_rank),  0)) AS rrf_score
        FROM bm25
        FULL OUTER JOIN vec ON bm25.id = vec.id
      )
      SELECT
        p.id,
        p.author_id,
        p.content,
        p.created_at,
        p.updated_at,
        u.id           AS author_id_u,
        u.username     AS author_username,
        u.email        AS author_email,
        u.name         AS author_name,
        u.image        AS author_image,
        COUNT(CASE WHEN pr.type = 'upvote'   THEN 1 END) AS upvote_count,
        COUNT(CASE WHEN pr.type = 'downvote' THEN 1 END) AS downvote_count,
        MAX(CASE WHEN pr.user_id = ${userId} THEN pr.type END) AS user_reaction_type,
        EXISTS (
          SELECT 1 FROM post_subscriptions ps
          WHERE ps.post_id = p.id AND ps.user_id = ${userId}
        ) AS current_user_subscribed,
        EXISTS (
          SELECT 1 FROM post_bookmarks pb
          WHERE pb.post_id = p.id AND pb.user_id = ${userId}
        ) AS current_user_bookmarked,
        (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count,
        rrf.rrf_score
      FROM rrf
      INNER JOIN posts p ON p.id = rrf.id
      INNER JOIN users_view u ON u.id = p.author_id
      LEFT JOIN post_reactions pr ON pr.post_id = p.id
      WHERE p.hidden = false
      GROUP BY p.id, p.author_id, p.content, p.created_at, p.updated_at,
               u.id, u.username, u.email, u.name, u.image, rrf.rrf_score
      ORDER BY rrf.rrf_score DESC
    `);

    return result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r["id"] as string,
        authorId: r["author_id"] as string,
        author: {
          id: r["author_id_u"] as string,
          username: (r["author_username"] as string | null) ?? null,
          email: r["author_email"] as string,
          name: (r["author_name"] as string | null) ?? null,
          image: this.usersService.resolveAvatarUrl(
            (r["author_image"] as string | null) ?? null,
          ),
        },
        content: r["content"] as PostDto["content"],
        createdAt: new Date(r["created_at"] as string).toISOString(),
        updatedAt: new Date(r["updated_at"] as string).toISOString(),
        upvoteCount: Number(r["upvote_count"]),
        downvoteCount: Number(r["downvote_count"]),
        commentCount: Number(r["comment_count"]),
        currentUserReaction:
          (r["user_reaction_type"] as ReactionTypeDto | null) ?? null,
        currentUserSubscribed: Boolean(r["current_user_subscribed"]),
        currentUserBookmarked: Boolean(r["current_user_bookmarked"]),
      } satisfies PostDto;
    });
  }
}
