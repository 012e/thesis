/**
 * Extensible recommendation filter interface.
 *
 * Filters run sequentially after candidate fetch and before ranking.
 * Each filter receives the full candidate set and returns a subset
 * of IDs that should be kept, along with optional per-post reason metadata.
 */

export const RECOMMENDATION_FILTERS = Symbol("RECOMMENDATION_FILTERS");

export interface RecommendationFilterInput {
  userId: string;
  candidatePostIds: string[];
  /** User preference vector (may be null for cold-start users). */
  profileVector: number[] | null;
  /** Context about the current generation run. */
  context: {
    batchId: string;
    trigger: string | null;
  };
}

export interface RecommendationFilterResult {
  /** Post IDs that passed this filter. */
  keptPostIds: string[];
  /** Optional per-post reason why it was filtered out. */
  filteredReasons?: Map<string, string>;
}

export interface RecommendationFilter {
  readonly name: string;
  apply(
    input: RecommendationFilterInput,
  ): Promise<RecommendationFilterResult>;
}
