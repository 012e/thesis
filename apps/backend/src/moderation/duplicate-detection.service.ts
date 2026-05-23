import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq, sql, ne, and, isNotNull } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { posts, EMBEDDING_DIMENSIONS } from "@/db/schema";
import {
  EMBEDDING_SERVICE,
  type IEmbeddingService,
} from "@/embedding/embedding.interface";

import { ContentHashService } from "./content-hash.service";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  method: "hash" | "embedding" | null;
  similarPostId: string | null;
  similarityScore: number | null;
}

/** Cosine similarity threshold above which two posts are considered duplicates. */
const SIMILARITY_THRESHOLD = 0.92;

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(EMBEDDING_SERVICE)
    private readonly embeddingService: IEmbeddingService,
    private readonly contentHashService: ContentHashService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Check if a post is a duplicate by:
   * 1. Exact content hash match
   * 2. Embedding cosine similarity above threshold
   */
  async check(
    postId: string,
    textContent: string | undefined | null,
  ): Promise<DuplicateCheckResult> {
    if (!textContent || textContent.trim().length === 0) {
      return {
        isDuplicate: false,
        method: null,
        similarPostId: null,
        similarityScore: null,
      };
    }

    // Step 1: Content hash check
    const hashResult = await this.checkByHash(postId, textContent);
    if (hashResult.isDuplicate) {
      this.logger.log(
        `Post ${postId} is an exact hash duplicate of ${hashResult.similarPostId}`,
      );
      return hashResult;
    }

    // Step 2: Embedding similarity check
    const embeddingResult = await this.checkByEmbedding(postId, textContent);
    if (embeddingResult.isDuplicate) {
      this.logger.log(
        `Post ${postId} is a near-duplicate (score=${embeddingResult.similarityScore}) of ${embeddingResult.similarPostId}`,
      );
    }

    return embeddingResult;
  }

  private async checkByHash(
    postId: string,
    textContent: string,
  ): Promise<DuplicateCheckResult> {
    const contentHash = this.contentHashService.hash(textContent);
    if (!contentHash) {
      return {
        isDuplicate: false,
        method: null,
        similarPostId: null,
        similarityScore: null,
      };
    }

    const [existing] = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.contentHash, contentHash), ne(posts.id, postId)))
      .limit(1);

    if (existing) {
      return {
        isDuplicate: true,
        method: "hash",
        similarPostId: existing.id,
        similarityScore: 1.0,
      };
    }

    return {
      isDuplicate: false,
      method: null,
      similarPostId: null,
      similarityScore: null,
    };
  }

  private async checkByEmbedding(
    postId: string,
    textContent: string,
  ): Promise<DuplicateCheckResult> {
    try {
      const embedding = await this.embeddingService.embed(textContent);

      // Query for the most similar post using cosine similarity
      const vectorStr = `[${embedding.join(",")}]`;
      const result = await this.db
        .select({
          id: posts.id,
          similarity: sql<number>`1 - (${posts.embedding} <=> ${vectorStr}::vector(${sql.raw(String(EMBEDDING_DIMENSIONS))}))`.as(
            "similarity",
          ),
        })
        .from(posts)
        .where(and(ne(posts.id, postId), isNotNull(posts.embedding)))
        .orderBy(
          sql`${posts.embedding} <=> ${vectorStr}::vector(${sql.raw(String(EMBEDDING_DIMENSIONS))})`,
        )
        .limit(1);

      if (result.length > 0 && result[0].similarity >= SIMILARITY_THRESHOLD) {
        return {
          isDuplicate: true,
          method: "embedding",
          similarPostId: result[0].id,
          similarityScore: result[0].similarity,
        };
      }

      return {
        isDuplicate: false,
        method: null,
        similarPostId: result.length > 0 ? result[0].id : null,
        similarityScore: result.length > 0 ? result[0].similarity : null,
      };
    } catch (error) {
      this.logger.warn(`Embedding similarity check failed: ${error}`);
      return {
        isDuplicate: false,
        method: null,
        similarPostId: null,
        similarityScore: null,
      };
    }
  }
}
