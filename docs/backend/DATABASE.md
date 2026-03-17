# Backend Database

## Overview

The backend uses **PostgreSQL** (≥ 14) with **Drizzle ORM** for query building and **drizzle-kit** for schema migrations.

There are two migration sets with separate lifecycles:

| Set                    | Location                  | Managed by      | Purpose                                             |
| ---------------------- | ------------------------- | --------------- | --------------------------------------------------- |
| Application migrations | `drizzle/`                | `drizzle-kit`   | `posts`, `users_view`, `post_reactions`             |
| Better Auth migrations | `better-auth_migrations/` | Better Auth CLI | `user`, `session`, `account`, `verification` tables |

Both migration sets must be run against the database before the application can start.

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

All commands read `DATABASE_URL` from the environment via `drizzle.config.ts`.

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

A read-only view over Better Auth's `"user"` table. The backend never queries `"user"` directly; it uses this view to keep a clean separation from Better Auth's schema.

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

## Migration history

| File                                  | Description                                               |
| ------------------------------------- | --------------------------------------------------------- |
| `drizzle/0000_nifty_spectrum.sql`     | Creates `posts` table and enables `pgcrypto` extension.   |
| `drizzle/0001_add_users_view.sql`     | Creates `users_view` over the Better Auth `"user"` table. |
| `drizzle/0002_add_post_reactions.sql` | Creates `reaction_type` enum and `post_reactions` table.  |

Better Auth migrations are in `better-auth_migrations/` and create the `user`, `session`, `account`, and `verification` tables. They are applied by the Better Auth CLI, not drizzle-kit.

## Connection pooling

`src/db/pool.ts` creates a single `pg.Pool` instance at module load time, connected via `DATABASE_URL`. The pool is provided to NestJS's DI container via the `DATABASE_POOL` injection token and injected into `DatabaseService`.

`DatabaseService` implements `OnModuleDestroy` to call `pool.end()` when the application shuts down, ensuring all connections are gracefully closed.

## Adding a new table

1. Add the table definition to `src/db/schema.ts`.
2. Export the inferred `$inferSelect` / `$inferInsert` types.
3. Run `pnpm --filter backend db:generate` to generate the migration SQL.
4. Review the generated file in `drizzle/` and run `pnpm --filter backend db:migrate` to apply it.
5. If the table produces a new DTO, add it to `packages/shared-dto` and update the contract in `packages/auth-contracts`.

## Test database

E2e tests spin up a real PostgreSQL container via **Testcontainers** (`@testcontainers/postgresql`). See `test/helpers/testcontainers.setup.ts` and `test/helpers/database.setup.ts`. The Better Auth migrations are applied programmatically before any tests run. Application (Drizzle) migrations are applied by the Drizzle client on test app startup.
