import { initClient } from "@ts-rest/core";
import { authContract } from "@repo/rest-contracts";
import { env } from "@/env";
import { handleAuthFailure } from "@/lib/auth";

const client = initClient(authContract, {
  baseUrl: env.VITE_BACKEND_URL,
  baseHeaders: {},
  credentials: "include",
});

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
