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
 * Excludes hidden posts from candidates.
 */
@Injectable()
export class VisiblePostFilter implements RecommendationFilter {
  readonly name = "VisiblePostFilter";

  constructor(private readonly databaseService: DatabaseService) {}

  async apply(
    input: RecommendationFilterInput,
  ): Promise<RecommendationFilterResult> {
    if (input.candidatePostIds.length === 0) {
      return { keptPostIds: [] };
    }

    const hiddenRows = await this.databaseService.db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(inArray(posts.id, input.candidatePostIds), eq(posts.hidden, true)),
      );

    const hiddenSet = new Set(hiddenRows.map((r) => r.id));
    const filteredReasons = new Map<string, string>();
    for (const id of hiddenSet) {
      filteredReasons.set(id, "hidden");
    }

    return {
      keptPostIds: input.candidatePostIds.filter((id) => !hiddenSet.has(id)),
      filteredReasons,
    };
  }
}
