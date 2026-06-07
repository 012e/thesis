import { Injectable } from "@nestjs/common";
import { eq, and, isNull, inArray } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { recommendationItems } from "@/db/schema";

import type {
  RecommendationFilter,
  RecommendationFilterInput,
  RecommendationFilterResult,
} from "./recommendation-filter.interface";

/**
 * Excludes posts already in the user's unserved recommendation queue.
 */
@Injectable()
export class AlreadyQueuedFilter implements RecommendationFilter {
  readonly name = "AlreadyQueuedFilter";

  constructor(private readonly databaseService: DatabaseService) {}

  async apply(
    input: RecommendationFilterInput,
  ): Promise<RecommendationFilterResult> {
    if (input.candidatePostIds.length === 0) {
      return { keptPostIds: [] };
    }

    const queuedRows = await this.databaseService.db
      .selectDistinct({ postId: recommendationItems.postId })
      .from(recommendationItems)
      .where(
        and(
          eq(recommendationItems.userId, input.userId),
          isNull(recommendationItems.servedAt),
          inArray(recommendationItems.postId, input.candidatePostIds),
        ),
      );

    const queuedSet = new Set(queuedRows.map((r) => r.postId));
    const filteredReasons = new Map<string, string>();
    for (const id of queuedSet) {
      filteredReasons.set(id, "already_queued");
    }

    return {
      keptPostIds: input.candidatePostIds.filter((id) => !queuedSet.has(id)),
      filteredReasons,
    };
  }
}
