import { z } from "zod";

/**
 * Supported analytics event types.
 * - post_view:       User viewed a post (with optional dwell time)
 * - post_like:       User liked/upvoted a post
 * - post_unlike:     User removed a like/upvote from a post
 * - post_bookmark:   User bookmarked a post
 * - post_unbookmark: User removed a bookmark
 * - comment_create:  User created a comment
 * - comment_like:    User liked a comment
 * - post_share:      User shared a post
 * - post_create:     User created a post
 * - poll_vote:       User voted in a poll
 * - search:          User performed a search
 * - page_view:       User viewed a page/route
 */
export const AnalyticsEventType = z.enum([
  "post_view",
  "post_like",
  "post_unlike",
  "post_bookmark",
  "post_unbookmark",
  "comment_create",
  "comment_like",
  "post_share",
  "post_create",
  "poll_vote",
  "search",
  "page_view",
]);

/** A single analytics event sent from the client. */
export const AnalyticsEvent = z.object({
  /** The type of event. */
  type: AnalyticsEventType,
  /** ISO-8601 timestamp when the event occurred on the client. */
  timestamp: z.string().datetime(),
  /** Arbitrary event-specific metadata (e.g. postId, dwellTimeMs, query). */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Request body for the batch analytics endpoint. */
export const AnalyticsBatchBody = z.object({
  events: z.array(AnalyticsEvent).min(1).max(100),
});

/** Response returned after successfully ingesting a batch. */
export const AnalyticsBatchResponse = z.object({
  ingested: z.number().int().nonnegative(),
});

/** Persisted analytics event as returned by the API. */
export const AnalyticsEventRow = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: AnalyticsEventType,
  metadata: z.record(z.string(), z.unknown()).nullable(),
  clientTimestamp: z.string().datetime(),
  createdAt: z.string().datetime(),
});

/** Paginated list of analytics events for the current user. */
export const AnalyticsEventsPage = z.object({
  items: z.array(AnalyticsEventRow),
  total: z.number().int().nonnegative(),
});

export type AnalyticsEventTypeEnum = z.infer<typeof AnalyticsEventType>;
export type AnalyticsEventInput = z.infer<typeof AnalyticsEvent>;
export type AnalyticsBatchBodyType = z.infer<typeof AnalyticsBatchBody>;
export type AnalyticsBatchResponseType = z.infer<typeof AnalyticsBatchResponse>;
export type AnalyticsEventRowType = z.infer<typeof AnalyticsEventRow>;
export type AnalyticsEventsPageType = z.infer<typeof AnalyticsEventsPage>;
