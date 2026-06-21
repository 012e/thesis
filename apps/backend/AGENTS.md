# Toin Backend Agent Guide

## Purpose

This package is Toin's NestJS API and MCP backend. It owns authentication,
social content and interactions, direct messages, notifications, moderation,
search, recommendations, uploads, analytics, configuration, and code-execution
proxying. It is part of the thesis implementation; keep technical claims
consistent with the source.

Work from `thesis/` and use pnpm workspace commands. Also obey the repository
guide at `thesis/AGENTS.md`.

## Architecture

- `src/main.ts`: creates the Nest Express app with the body parser disabled for
  Better Auth, configures CORS and Socket.IO, and enables shutdown hooks.
- `src/app.module.ts`: composition root. New feature modules must be imported
  here.
- `src/<feature>/`: Nest modules grouped by domain. Controllers should translate
  transport input/output; services own business logic and Drizzle queries.
  Larger domains such as `posts/` split reads, mutations, presentation,
  engagement, search, and notifications into focused services.
- `src/db/`: global database module, shared PostgreSQL pool, Drizzle client,
  application schema, and generated Better Auth schema.
- `src/auth/`: Better Auth configuration and the small ts-rest auth facade.
- `src/mcp/`: MCP tools for identity, posts, and interactions.
- `src/messages/` and `src/notifications/`: REST plus authenticated Socket.IO
  namespaces. Background notification/recommendation work uses pg-boss.
- `src/moderation/`, `src/embedding/`, `src/recommendations/`: asynchronous
  moderation and vector/BM25 recommendation pipelines.
- `src/storage/`: S3-compatible MinIO storage and image processing.
- `test/`: Vitest integration/e2e suites and app/container/auth helpers.
- `drizzle/`: ordered SQL migrations plus Drizzle metadata; inspect generated
  SQL before accepting it.

HTTP APIs are contract-first. Routes and runtime request/response schemas live
in `@repo/rest-contracts`; shared shapes live in `@repo/shared-dto`. Update and
build those packages before implementing a changed API. Backend controllers use
`@TsRestHandler`, `tsRestHandler`, and usually parse responses against the
contract. Do not introduce an ad hoc HTTP route when it belongs in the contract.

## Commands

Run from `thesis/`:

```bash
pnpm --filter backend serve            # development watch mode
pnpm --filter backend build
pnpm --filter backend typecheck
pnpm --filter backend lint             # runs oxlint --fix; may edit files
pnpm --filter backend format           # writes src/**/*.ts and test/**/*.ts
pnpm --filter backend test             # all configured *.e2e-spec.ts suites
pnpm --filter backend test:verbose
pnpm --filter backend test:<domain>    # e.g. test:posts, test:messages
pnpm --filter backend test -- test/posts/posts.controller.e2e-spec.ts
pnpm --filter backend db:check
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
pnpm --filter backend db:studio
pnpm --filter backend auth:migrate
```

Build contract dependencies before backend tests when their sources changed:

```bash
pnpm --filter @repo/shared-dto build
pnpm --filter @repo/rest-contracts build
```

The repository `just test-<domain>` recipes do this automatically. Docker is
required for integration tests.

## Conventions

- Use the `@/` alias for backend source and `@repo/*` for workspace packages.
  Follow the existing import grouping: external, workspace, app alias, relative.
- Use kebab-case filenames and normal Nest naming
  (`FeatureModule`, `FeatureController`, `FeatureService`).
- Keep controllers thin. Obtain identity with `@Session()` and pass
  `session.user.id`; enforce ownership/visibility in services or explicit
  controller checks.
- Validate through the shared contract and feature Zod schemas. Preserve
  contract status codes and parse returned DTOs when practical.
- Use `DatabaseService.db` and Drizzle. Parameterize dynamic values; reserve raw
  SQL for database-specific operations such as ParadeDB BM25, pgvector, views,
  locking, or complex aggregates.
- Keep feed pagination cursor-based and deterministic; preserve the relevant
  timestamp/ID tie-breaker and cursor helpers.
- Treat notifications, storage cleanup, moderation, and similar post-commit
  side effects deliberately: existing code often makes them non-fatal and logs
  failures.
- New environment variables belong in `src/env.ts` and `.env.example`.

## Database and Auth

- PostgreSQL must be ParadeDB, not plain Postgres: search migrations and queries
  require `pg_search`/BM25, while embeddings and recommendations require
  `pgvector`. Tests use `paradedb/paradedb:latest`.
- `src/db/schema.ts` is the application schema. `src/db/auth-schema.ts` is
  generated for Better Auth; do not casually hand-edit it.
- Drizzle Kit reads both schema files. For schema changes, edit the schema, run
  `db:generate`, review the SQL and `drizzle/meta`, then test against a fresh
  database. Prefer committed migrations over `db:push`.
- Better Auth owns `user`, `session`, `account`, verification, and JWKS data.
  Application profile data is in `user_profiles`; `users_view` joins it to the
  auth-owned user table. Auth migrations and view dependencies must remain
  ordered.
- Authentication is global through `AuthModule`. Mark genuinely public routes
  with `@AllowAnonymous()`; normal REST handlers use session cookies or bearer
  tokens. Sign-up requires `username`.
- Better Auth endpoints are mounted under `/api/auth/*`. WebSockets authenticate
  with a bearer token in `handshake.auth.token` or the Authorization header,
  then join `user:<id>` rooms.

## Testing and Verification

- Vitest discovers `test/**/*.e2e-spec.ts`; `src/app.controller.spec.ts` is not
  included by the current test config.
- Tests are serialized (`maxWorkers: 1`, no file parallelism). Most suites boot
  a real Nest app and a fresh ParadeDB Testcontainer; storage-sensitive suites
  also start MinIO or override `StorageService`.
- Apply every SQL file through `runBetterAuthMigrations()` before app startup.
  `createTestApp()` sets test env before dynamically importing `AppModule`,
  disables the body parser, installs Socket.IO, and replaces pg-boss providers.
- Register users through `/api/auth/sign-up/email`; reuse helpers in
  `test/helpers/auth.helper.ts`. Cookie auth covers HTTP. Use the returned bearer
  token for Socket.IO tests.
- Truncate all affected tables in `beforeEach`, including new dependent tables,
  and retain auth users when reusing cookies. Close pools/apps before stopping
  containers.

For a focused change, run build/typecheck and the affected domain suite. For
database, auth, contracts, shared DTOs, module wiring, or cross-domain changes,
also run broader related suites or the full backend test command. Report any
checks skipped because Docker or an external service was unavailable.

## Important Pitfalls

- `env`, the database pool, auth, embedding selection, and several clients are
  initialized at module-import time. In tests, set environment variables before
  importing `AppModule`; late env changes will not reconfigure them.
- Keep `bodyParser: false` in both production and test app creation or Better
  Auth request handling breaks.
- Local startup can require ParadeDB, MinIO, pg-boss tables, Piston, and the AI
  service. OpenAI is optional: without `OPENAI_API_KEY`, embeddings use the
  zero-vector stub, but moderation/LLM behavior may also degrade or skip work.
- `StorageService` creates the bucket and applies a public-read policy during
  module initialization. Tests tolerate missing MinIO; non-test startup does
  not.
- Post-creation moderation is fire-and-forget and can hide a post after the
  create response. Notification and recommendation delivery may be queued.
- `/migrate` and `/seed` are currently anonymous; `/seed` is destructive.
  Never call either casually or expose them without considering deployment
  controls.
- Migration filenames contain historical duplicate/out-of-sequence numeric
  prefixes. Migration order is the journal/order already committed, not a
  filename-renaming exercise.
- The package README's RabbitMQ reference is stale; current background jobs use
  PostgreSQL-backed pg-boss.
- Do not edit `dist/`, generated artifacts, or unrelated working-tree changes.
