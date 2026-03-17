# Backend

NestJS REST API for the thesis application. Provides posts and reactions features with Better Auth session-based authentication, backed by PostgreSQL via Drizzle ORM.

## Quick reference

| Task                     | Command                            |
| ------------------------ | ---------------------------------- |
| Start dev server (watch) | `pnpm --filter backend serve`      |
| Build                    | `pnpm --filter backend build`      |
| Lint                     | `pnpm --filter backend lint`       |
| Run all tests            | `pnpm --filter backend test`       |
| Run tests (watch)        | `pnpm --filter backend test:watch` |
| Run e2e tests            | `pnpm --filter backend test:e2e`   |
| Run DB migrations        | `pnpm --filter backend db:migrate` |
| Open Drizzle Studio      | `pnpm --filter backend db:studio`  |

The server starts on `PORT` (default `3000`). Copy `.env.example` to `.env` and fill in the values before starting. See [CONFIG.md](./CONFIG.md) for all environment variables.

## Feature modules

| Module            | Description                                                                             |
| ----------------- | --------------------------------------------------------------------------------------- |
| `AuthModule`      | Mounts Better Auth middleware at `/api/auth/*`. Handles sign-up, sign-in, session, JWT. |
| `PostsModule`     | CRUD for social-media-style posts with rich content (text / poll / visualization).      |
| `ReactionsModule` | Upvote / downvote reactions on posts; summary counts and reactor lists.                 |
| `DatabaseModule`  | Global module providing the `pg.Pool` and Drizzle `DatabaseService` to all modules.     |

## Key technology choices

- **NestJS 11** – module/controller/service architecture, dependency injection.
- **Better Auth** – session management and JWT generation. Integrated via `@thallesp/nestjs-better-auth`. Auth routes live at `/api/auth/*` and are handled by Better Auth's own middleware; `bodyParser` is disabled at the NestJS level so Better Auth can parse the raw request body.
- **ts-rest** – typed HTTP contract library. All routes are declared in `@repo/auth-contracts` and implemented with `@TsRestHandler` decorators. The contract is the single source of truth shared between backend and frontend.
- **Drizzle ORM** – SQL query builder and schema definition. Migrations are stored in `drizzle/` and run via `drizzle-kit migrate`.
- **Zod 4** – runtime validation at request boundaries.

## Further reading

- [CONFIG.md](./CONFIG.md) – environment variable reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) – module structure, request lifecycle, and design decisions
- [DATABASE.md](./DATABASE.md) – schema, migrations, and database conventions
