# Recommendation Service

Personalized post-ranking pipeline built around a **precomputed queue model**.
When a user requests recommendations the response is served from a pre-ranked,
persisted queue. The queue is replenished in the background before it runs dry.

## Overview

The pipeline runs in four stages:

| Stage | Service                         | Responsibility                                                   |
| ----- | ------------------------------- | ---------------------------------------------------------------- |
| A     | `UserPreferenceVectorService`   | Build and persist a user preference vector from analytics events |
| B     | `RecommendationPipelineService` | Fetch candidates, apply filters, rank, persist to queue          |
| C     | `RecommendationService`         | Serve items from queue; trigger Stage A+B when needed            |
| D     | `RecommendationJobsService`     | PgBoss background job handler for asynchronous Stage A+B         |

## Directory layout

```
apps/backend/src/recommendations/
├── recommendation.service.ts           # Public entry point: queue reads, cold-start, job enqueue
├── recommendation-pipeline.service.ts  # Full pipeline: vector → candidates → filter → rank → persist
├── user-preference-vector.service.ts   # Build / upsert user_recommendation_profiles
├── recommendation-jobs.service.ts      # PgBoss @Job handler ("generate-recommendations")
├── recommendation-cursors.ts           # encodeQueueCursor / decodeQueueCursor (base64url)
├── recommendations.module.ts           # NestJS module wiring services and filter providers
└── filters/
    ├── recommendation-filter.interface.ts  # RecommendationFilter interface + DI token
    ├── visible-post.filter.ts              # Removes hidden posts
    ├── own-post.filter.ts                  # Removes posts authored by the requesting user
    ├── already-interacted.filter.ts        # Removes posts with any analytics event for this user
    ├── already-queued.filter.ts            # Removes posts already in the unserved queue
    └── index.ts                            # Barrel re-export
```

## Stage A — User preference vector

`UserPreferenceVectorService.buildForUser(userId)` reads the last 30 days of
`analytics_events` rows for the user, weights each event by action type, and
computes a weighted average over the `embedding` vectors of the associated posts.
The resulting vector is L2-normalized and stored in `user_recommendation_profiles`.

### Event weights

| Event             | Weight |
| ----------------- | ------ |
| `post_bookmark`   | +5     |
| `comment_create`  | +4     |
| `post_like`       | +4     |
| `post_share`      | +3     |
| `poll_vote`       | +2     |
| `post_view`       | +1     |
| `post_unbookmark` | −3     |
| `post_unlike`     | −2     |

Returns `false` (cold-start) when fewer than 3 qualifying events exist.

## Stage B — Pipeline: candidates → filter → rank → persist

`RecommendationPipelineService.generateForUser(userId, trigger)`:

1. **Load vector** — call Stage A. If cold-start, skip similarity ranking.
2. **Fetch candidates** — up to 500 recent, non-hidden posts from the `posts` table.
3. **Apply filters** — each `RecommendationFilter` is called sequentially:
   - `VisiblePostFilter` — removes `hidden = true`.
   - `OwnPostFilter` — removes `author_id = userId`.
   - `AlreadyInteractedFilter` — removes posts with any analytics event for this user.
   - `AlreadyQueuedFilter` — removes posts already present in the unserved queue.
4. **Rank** — cosine similarity via pgvector (`<=>` operator) for warm users;
   recency score (`created_at DESC`) for cold-start users.
5. **Persist** — insert a `recommendation_batches` audit row (status → `completed`)
   and up to 100 `recommendation_items` rows linked to it.

## Stage C — Serving from queue

`RecommendationService.getRecommendations(userId, limit, cursor)`:

```
remaining = count of unserved items for userId

if remaining == 0:
    run Stage A+B synchronously  ← cold start / first load
elif remaining <= 20:            ← GENERATION_THRESHOLD
    enqueue "generate-recommendations" PgBoss job  ← background replenishment

return readFromQueue(userId, limit, cursor)
```

`readFromQueue` marks items `served_at = now()`, hydrates full `PostDto` objects
via `PostsPresenterService`, and returns a `RecommendationPage` with a keyset cursor.

### Cursor format

The pagination cursor is a base64url-encoded JSON blob:

```ts
{
  rank: number;
  itemId: string; /* UUID */
}
```

Encoding and decoding are handled by `recommendation-cursors.ts`.
The cursor encodes the last-seen item's rank and primary key, giving stable
pagination that survives concurrent queue mutations.

## Stage D — Background job

`RecommendationJobsService` subscribes to the `generate-recommendations` PgBoss
job (batch size 3, concurrency 1). It receives `{ userId, trigger }` and calls
`RecommendationPipelineService.generateForUser`.

Jobs are deduplicated per user with `singletonKey: rec-${userId}`, so at most
one pending regeneration job exists per user at any time.

## API endpoint

Defined inside `postsContract` in `packages/rest-contracts/src/contracts/posts.ts`.

```
GET /recommendations
  Auth:    required (Bearer token)
  Query:   limit?  (integer 1–100, default 20)
           cursor? (string, opaque keyset cursor)
  200:     RecommendationPage
```

`RecommendationPage` schema (`packages/rest-contracts/src/schemas/post.ts`):

```ts
z.object({
  items: z.array(Post),
  nextCursor: z.string().nullable(),
});
```

The handler lives in `PostsController.getRecommendations` (not a separate
controller) and requires an authenticated `@Session()`.

## Integration points

| Dependency                | How                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PostsModule**           | `PostsController` injects `RecommendationService`. `PostsModule` uses `forwardRef(() => RecommendationsModule)` to break the circular dependency.                                                 |
| **PostsPresenterService** | `RecommendationService.hydratePostIds` reuses this service to convert raw DB rows to `PostDto` (including tag hydration).                                                                         |
| **AnalyticsModule**       | `UserPreferenceVectorService` and `AlreadyInteractedFilter` both read `analytics_events`. Event `metadata.postId` links events to posts.                                                          |
| **EmbeddingModule**       | Posts carry a `vector(1536)` `embedding` column. Similarity ranking uses pgvector's `<=>` operator against this column.                                                                           |
| **PgBossModule**          | `@wavezync/nestjs-pgboss` provides the job queue. `RecommendationJobsService` registers a `@Job` subscriber.                                                                                      |
| **AppModule**             | `RecommendationsModule` is imported at the root; `PgBossModule.forRootAsync` is also configured there.                                                                                            |
| **MCP PostTools**         | `apps/backend/src/mcp/posts/post.tools.ts` still calls the **legacy** `PostsService.recommendations()` (reaction-count ranking). The MCP layer has not been migrated to the queue-based pipeline. |

## Web integration

| File                                        | Role                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/api/recommendations.ts`   | `fetchRecommendations()` — ts-rest client call                                                                             |
| `apps/web/src/hooks/use-recommendations.ts` | `useRecommendations()` — TanStack Query infinite query (5 min stale time). Prepends session-storage new posts into page 0. |

## Testing

Tests live in `apps/backend/test/recommendations/`. All tests are integration
tests using a real ParadeDB container (see [ARCHITECTURE.md](./ARCHITECTURE.md)
for the shared test setup).

Run the recommendation suite:

```sh
just test-recommendations
# or
pnpm --filter backend test -- test/recommendations/
```
