import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  AnalyticsBatchBody,
  AnalyticsBatchResponse,
  AnalyticsEventsPage,
} from "../schemas/analytics";

const c = initContract();

export const analyticsContract = c.router({
  ingestEvents: {
    method: "POST",
    path: "/analytics/events",
    body: AnalyticsBatchBody,
    responses: {
      201: AnalyticsBatchResponse,
    },
    summary:
      "Ingest a batch of analytics events from the client (max 100 per request).",
  },
  getMyEvents: {
    method: "GET",
    path: "/analytics/events",
    query: z.object({
      limit: z.coerce.number().int().positive().max(100).optional(),
      offset: z.coerce.number().int().nonnegative().optional(),
      type: z.string().optional(),
    }),
    responses: {
      200: AnalyticsEventsPage,
    },
    summary:
      "Get analytics events for the currently authenticated user (paginated).",
  },
});

export type AnalyticsContract = typeof analyticsContract;
