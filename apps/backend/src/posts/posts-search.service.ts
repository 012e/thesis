import { Inject, Injectable, Logger } from "@nestjs/common";
import { sql } from "drizzle-orm";
import OpenAI from "openai";
import type { PostDto, ReactionTypeDto } from "@repo/shared-dto";
import { toSql } from "pgvector";

import { DatabaseService } from "@/db/database.service";
import {
  EMBEDDING_SERVICE,
  type IEmbeddingService,
} from "@/embedding/embedding.interface";
import { env } from "@/env";
import { UsersService } from "@/users/users.service";

import { PostsService } from "./posts.service";

const FIRST_STAGE_CANDIDATE_LIMIT = 100;
const RERANK_CANDIDATE_LIMIT = 100;
const RERANK_MODEL = "gpt-4.1-nano";
const RERANK_SNIPPET_MAX_LENGTH = 700;

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
  private readonly logger = new Logger(PostsSearchService.name);
  private readonly openai: OpenAI | null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersService: UsersService,
    private readonly postsService: PostsService,
    @Inject(EMBEDDING_SERVICE)
    private readonly embeddingService: IEmbeddingService,
  ) {
    this.openai =
      env.OPENAI_API_KEY && env.NODE_ENV !== "test"
        ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
        : null;
  }

  async search(query: string, userId: string): Promise<PostDto[]> {
    const queryEmbedding = await this.embeddingService.embed(query);
    const queryVector = toSql(queryEmbedding);

    const result = await this.databaseService.db.execute(sql`
      WITH bm25 AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY paradedb.score(id) DESC) AS bm25_rank
        FROM posts
        WHERE hidden = false
          AND id @@@ paradedb.match('content.text', ${query})
        LIMIT ${FIRST_STAGE_CANDIDATE_LIMIT}
      ),
      vec AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> ${queryVector}::vector ASC) AS vec_rank
        FROM posts
        WHERE hidden = false
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${queryVector}::vector
        LIMIT ${FIRST_STAGE_CANDIDATE_LIMIT}
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
      LIMIT ${RERANK_CANDIDATE_LIMIT}
    `);

    const dtos = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      const currentUserReaction =
        (r["user_reaction_type"] as ReactionTypeDto | null) ?? null;

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
        currentUserReaction,
        currentUserUpvoted: currentUserReaction === "upvote",
        currentUserDownvoted: currentUserReaction === "downvote",
        currentUserSubscribed: Boolean(r["current_user_subscribed"]),
        currentUserBookmarked: Boolean(r["current_user_bookmarked"]),
        tags: [],
      } satisfies PostDto;
    });

    const hydrated = await this.postsService.hydrateTags(dtos);
    return this.rerankWithOpenAi(query, hydrated);
  }

  private async rerankWithOpenAi(
    query: string,
    posts: PostDto[],
  ): Promise<PostDto[]> {
    if (!this.openai || posts.length < 2) return posts;

    const candidates = posts.map((post, index) => ({
      id: post.id,
      rank: index + 1,
      text: this.truncateForRerank(post.content.text ?? ""),
    }));

    try {
      const response = await this.openai.chat.completions.create({
        model: RERANK_MODEL,
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You rerank social post search results. Return only valid JSON with rankedIds. Prefer posts that directly and specifically satisfy the search query. Keep all provided ids exactly once when possible.",
          },
          {
            role: "user",
            content: JSON.stringify({
              query,
              candidates,
              responseShape: { rankedIds: ["post-id"] },
            }),
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return posts;

      const rankedIds = this.parseRankedIds(content);
      if (rankedIds.length === 0) return posts;

      const postById = new Map(posts.map((post) => [post.id, post]));
      const usedIds = new Set<string>();
      const reranked: PostDto[] = [];

      for (const id of rankedIds) {
        const post = postById.get(id);
        if (!post || usedIds.has(id)) continue;
        reranked.push(post);
        usedIds.add(id);
      }

      for (const post of posts) {
        if (!usedIds.has(post.id)) reranked.push(post);
      }

      return reranked;
    } catch (error) {
      this.logger.warn(
        `OpenAI search reranking failed; using hybrid order: ${error instanceof Error ? error.message : String(error)}`,
      );
      return posts;
    }
  }

  private parseRankedIds(content: string): string[] {
    const parsed = JSON.parse(content) as { rankedIds?: unknown };
    if (!Array.isArray(parsed.rankedIds)) return [];

    return parsed.rankedIds.filter((id): id is string => typeof id === "string");
  }

  private truncateForRerank(text: string): string {
    return text.length > RERANK_SNIPPET_MAX_LENGTH
      ? `${text.slice(0, RERANK_SNIPPET_MAX_LENGTH)}...`
      : text;
  }
}
