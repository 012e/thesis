import { Injectable } from "@nestjs/common";
import { eq, and, inArray, sql } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { analyticsEvents } from "@/db/schema";

import type {
  RecommendationFilter,
  RecommendationFilterInput,
  RecommendationFilterResult,
} from "./recommendation-filter.interface";

/**
 * Excludes posts the user has already interacted with
 * (has an analytics event with metadata.postId matching).
 */
@Injectable()
export class AlreadyInteractedFilter implements RecommendationFilter {
  readonly name = "AlreadyInteractedFilter";

  constructor(private readonly databaseService: DatabaseService) {}

  async apply(
    input: RecommendationFilterInput,
  ): Promise<RecommendationFilterResult> {
    if (input.candidatePostIds.length === 0) {
      return { keptPostIds: [] };
    }

    const interactedRows = await this.databaseService.db
      .selectDistinct({
        postId: sql<string>`${analyticsEvents.metadata}->>'postId'`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.userId, input.userId),
          inArray(
            sql`${analyticsEvents.metadata}->>'postId'`,
            input.candidatePostIds,
          ),
        ),
      );

    const interactedSet = new Set(
      interactedRows.map((r) => r.postId).filter(Boolean),
    );
    const filteredReasons = new Map<string, string>();
    for (const id of interactedSet) {
      filteredReasons.set(id, "already_interacted");
    }

    return {
      keptPostIds: input.candidatePostIds.filter(
        (id) => !interactedSet.has(id),
      ),
      filteredReasons,
    };
  }
}
