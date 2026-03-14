# Backend

NestJS backend with Better Auth, RabbitMQ events, and Drizzle ORM for PostgreSQL.

## Drizzle setup

This app uses the current Drizzle v1-style workflow:

- `src/db/schema.ts` defines the PostgreSQL schema.
- `drizzle.config.ts` configures Drizzle Kit with `dialect`, `schema`, `out`, and `dbCredentials`.
- `drizzle/*.sql` contains generated SQL migrations.

Available commands:

```bash
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
pnpm --filter backend db:push
pnpm --filter backend db:studio
pnpm --filter backend db:check
```

## Posts CRUD

Posts are stored in the `posts` table with a `jsonb` `content` column so the payload can represent text posts, polls, visualizations, and other future content types.

Routes are defined in `@repo/auth-contracts` and implemented in `src/posts/posts.controller.ts`.
