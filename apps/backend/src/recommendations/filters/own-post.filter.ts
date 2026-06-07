import { Injectable } from "@nestjs/common";
import { eq, and, inArray } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { posts } from "@/db/schema";

import type {
  RecommendationFilter,
  RecommendationFilterInput,
  RecommendationFilterResult,
} from "./recommendation-filter.interface";

/**
 * Excludes posts authored by the requesting user.
 */
@Injectable()
export class OwnPostFilter implements RecommendationFilter {
  readonly name = "OwnPostFilter";

  constructor(private readonly databaseService: DatabaseService) {}

  async apply(
    input: RecommendationFilterInput,
  ): Promise<RecommendationFilterResult> {
    if (input.candidatePostIds.length === 0) {
      return { keptPostIds: [] };
    }

    const ownRows = await this.databaseService.db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          inArray(posts.id, input.candidatePostIds),
          eq(posts.authorId, input.userId),
        ),
      );

    const ownSet = new Set(ownRows.map((r) => r.id));
    const filteredReasons = new Map<string, string>();
    for (const id of ownSet) {
      filteredReasons.set(id, "own_post");
    }

    return {
      keptPostIds: input.candidatePostIds.filter((id) => !ownSet.has(id)),
      filteredReasons,
    };
  }
}
