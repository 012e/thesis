import { client } from ".";
import { handleAuthFailure } from "@/lib/auth";
import type { AnalyticsEventInput } from "@repo/rest-contracts";

/**
 * Send a batch of analytics events to the backend.
 * Returns the number of events ingested.
 */
export async function ingestAnalyticsEvents(
  events: AnalyticsEventInput[],
): Promise<number> {
  const response = await client.ingestEvents({
    body: { events },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 201) {
    return response.body.ingested;
  }

  throw new Error("Failed to ingest analytics events");
}

/**
 * Fetch the current user's analytics events.
 */
export async function fetchMyAnalyticsEvents(options?: {
  limit?: number;
  offset?: number;
  type?: string;
}) {
  const response = await client.getMyEvents({
    query: {
      limit: options?.limit,
      offset: options?.offset,
      type: options?.type,
    },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to fetch analytics events");
}
