import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export interface RecommendationsParams {
  limit?: number;
  cursor?: string;
}

export async function fetchRecommendations(params: RecommendationsParams) {
  const response = await client.getRecommendations({
    query: {
      limit: params.limit,
      cursor: params.cursor,
    },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to fetch recommendations");
}
