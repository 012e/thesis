# Backend Database

## Overview

The backend uses **PostgreSQL** (≥ 14) with **Drizzle ORM** for query building and **drizzle-kit** for schema migrations.

There are two migration sets with separate lifecycles:

| Set                    | Location                 | Managed by      | Purpose                                                   |
| ---------------------- | ------------------------ | --------------- | --------------------------------------------------------- |
| Application migrations | `apps/backend/drizzle/`  | `drizzle-kit`   | `posts`, `users_view`, `post_reactions`, other app tables |
| Better Auth migrations | (managed by Better Auth) | Better Auth CLI | `user`, `session`, `account`, `verification` tables       |

Application (drizzle-kit) migrations and Better Auth migrations must both be applied before the app can start. Drizzle migration files are under `apps/backend/drizzle/`.

## Drizzle commands

```sh
# Check for schema/migration inconsistencies
pnpm --filter backend db:check

# Generate a new migration file from schema changes
pnpm --filter backend db:generate

# Apply pending migrations
pnpm --filter backend db:migrate

# Push schema to DB without creating a migration file (dev shortcut)
pnpm --filter backend db:push

# Open Drizzle Studio (browser-based table viewer)
pnpm --filter backend db:studio
```

All commands read `DATABASE_URL` from the environment via the backend drizzle configuration.

## Schema (`src/db/schema.ts`)

### `posts` table

Stores social-media-style posts. The `content` column is JSONB and maps to the `PostContentDto` type (text / poll / visualization union).

| Column       | Type          | Notes                                                                                         |
| ------------ | ------------- | --------------------------------------------------------------------------------------------- |
| `id`         | `uuid`        | Primary key, auto-generated with `gen_random_uuid()`.                                         |
| `author_id`  | `text`        | FK-by-convention to Better Auth `user.id` (no DB-level FK to avoid cross-migration coupling). |
| `content`    | `jsonb`       | Rich post content; see post content shape in [API.md](./API.md).                              |
| `created_at` | `timestamptz` | Set to `now()` on insert.                                                                     |
| `updated_at` | `timestamptz` | Set to `now()` on insert; updated manually on edit.                                           |

### `users_view` view

A read-only view over Better Auth's `"user"` table. The backend reads user data through this view to keep a separation from Better Auth's internal schema.

```sql
SELECT id, username, email, name FROM "user";
```

| Column     | Type   | Notes                                               |
| ---------- | ------ | --------------------------------------------------- |
| `id`       | `text` | Better Auth user ID.                                |
| `username` | `text` | Nullable; set by the Better Auth `username` plugin. |
| `email`    | `text` | User email.                                         |
| `name`     | `text` | Nullable display name.                              |

### `post_reactions` table

Tracks upvote/downvote reactions. The composite primary key `(post_id, user_id)` enforces one reaction per user per post. On conflict the existing row is replaced (upsert) with the new reaction type.

| Column       | Type            | Notes                                                                           |
| ------------ | --------------- | ------------------------------------------------------------------------------- |
| `post_id`    | `uuid`          | FK → `posts.id` `ON DELETE CASCADE`. Deleting a post removes all its reactions. |
| `user_id`    | `text`          | Better Auth user ID.                                                            |
| `type`       | `reaction_type` | Enum: `upvote` or `downvote`.                                                   |
| `created_at` | `timestamptz`   | Set to `now()` on insert/upsert.                                                |

### `reaction_type` enum

```sql
CREATE TYPE reaction_type AS ENUM ('upvote', 'downvote');
```

### `user_recommendation_profiles` table

One row per user. Stores the normalized preference vector built from the user's analytics events.

| Column                | Type                | Notes                                                                 |
| --------------------- | ------------------- | --------------------------------------------------------------------- |
| `user_id`             | `text` PRIMARY KEY  | Better Auth user ID.                                                  |
| `vector`              | `vector(1536)`      | Normalized preference vector (pgvector); `null` for cold-start users. |
| `event_count`         | `integer DEFAULT 0` | Number of analytics events used to build the vector.                  |
| `last_generated_at`   | `timestamptz`       | When the vector was last rebuilt.                                     |
| `source_window_start` | `timestamptz`       | Start of the 30-day analytics window.                                 |
| `source_window_end`   | `timestamptz`       | End of the analytics window.                                          |

### `recommendation_batch_status` enum

```sql
CREATE TYPE recommendation_batch_status AS ENUM ('pending', 'running', 'completed', 'failed');
```

### `recommendation_batches` table

One row per generation run. Acts as an audit log for pipeline executions.

| Column         | Type                                            | Notes                                                                |
| -------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| `id`           | `uuid` PRIMARY KEY                              | Auto-generated with `gen_random_uuid()`.                             |
| `user_id`      | `text` NOT NULL                                 | Requesting user.                                                     |
| `status`       | `recommendation_batch_status DEFAULT 'pending'` | Lifecycle state.                                                     |
| `trigger`      | `text`                                          | Why the batch was created, e.g. `cold_start`, `low_queue`, `manual`. |
| `created_at`   | `timestamptz`                                   | Set to `now()` on insert.                                            |
| `completed_at` | `timestamptz`                                   | `null` until the run finishes or fails.                              |
| `error`        | `text`                                          | Error message when `status = 'failed'`.                              |

### `recommendation_items` table

Up to 100 rows per batch. Represents the pre-ranked queue served to the user.

| Column           | Type                        | Notes                                                                   |
| ---------------- | --------------------------- | ----------------------------------------------------------------------- |
| `id`             | `uuid` PRIMARY KEY          | Auto-generated.                                                         |
| `batch_id`       | `uuid` NOT NULL             | FK → `recommendation_batches.id` `ON DELETE CASCADE`.                   |
| `user_id`        | `text` NOT NULL             | Denormalized for fast reads without a join to `recommendation_batches`. |
| `post_id`        | `uuid` NOT NULL             | FK → `posts.id` `ON DELETE CASCADE`.                                    |
| `rank`           | `integer` NOT NULL          | 1-based position from the ranking step.                                 |
| `score`          | `double precision` NOT NULL | Cosine similarity (warm) or recency score (cold-start).                 |
| `filter_reasons` | `jsonb` (`string[]`)        | Debug: reasons each candidate post was nearly filtered out.             |
| `served_at`      | `timestamptz`               | `null` = unserved; set to `now()` on first read.                        |

**Indexes:**

| Index                                    | Columns                      | Purpose                                                       |
| ---------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| `idx_recommendation_items_user_unserved` | `(user_id, served_at, rank)` | Primary read path: fetch next unserved items ordered by rank. |
| `idx_recommendation_items_user_post`     | `(user_id, post_id)`         | Deduplication lookup in `AlreadyQueuedFilter`.                |

## Migration history

| File                                       | Description                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `drizzle/0000_nifty_spectrum.sql`          | Creates `posts` table and enables `pgcrypto` extension.                                                                                                |
| `drizzle/0001_add_users_view.sql`          | Creates `users_view` over the Better Auth `"user"` table.                                                                                              |
| `drizzle/0002_add_post_reactions.sql`      | Creates `reaction_type` enum and `post_reactions` table.                                                                                               |
| `drizzle/0024_recommendation_pipeline.sql` | Creates `recommendation_batch_status` enum, `user_recommendation_profiles`, `recommendation_batches`, `recommendation_items` tables and their indexes. |

Better Auth migrations are managed and applied by the Better Auth CLI (see `pnpm --filter backend run auth:migrate` for helper scripts). They create the `user`, `session`, `account`, and `verification` tables and are separate from the Drizzle-managed application migrations.

## Connection pooling

`src/db/pool.ts` creates a single `pg.Pool` instance at module load time, connected via `DATABASE_URL`. The pool is provided to NestJS's DI container via the `DATABASE_POOL` injection token and injected into `DatabaseService`.

`DatabaseService` implements `OnModuleDestroy` to call `pool.end()` when the application shuts down, ensuring all connections are gracefully closed.

## Adding a new table

1. Add the table definition to `src/db/schema.ts`.
2. Export the inferred `$inferSelect` / `$inferInsert` types.
3. Run `pnpm --filter backend db:generate` to generate the migration SQL.
4. Review the generated file in `drizzle/` and run `pnpm --filter backend db:migrate` to apply it.
5. If the table produces a new DTO, add it to `packages/shared-dto` and update the contract in `packages/rest-contracts`.

## Test database

E2e tests spin up a real PostgreSQL container via **Testcontainers** (`@testcontainers/postgresql`). See `test/helpers/testcontainers.setup.ts` and `test/helpers/database.setup.ts`. The Better Auth migrations are applied programmatically before any tests run. Application (Drizzle) migrations are applied by the Drizzle client on test app startup.
