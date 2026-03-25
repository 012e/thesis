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

## Database Seeding

Populate the database with sample data for development and testing using Faker.js.

### Running the seed script

```bash
pnpm --filter backend seed
```

The seed script creates:

- **5 users** with fake names, emails, and usernames
- **15 posts** (3 per user) with varied content types:
  - Text posts (60%)
  - Poll posts (20%)
  - Visualization posts (20%)
- **Post reactions** (upvotes/downvotes) with random distribution
- **10 threads** (2 per user) for multi-turn conversations
- **User follows** with random connections

### Customizing the seed

Edit `seed.ts` to modify:

- `seedUsers(count)` - number of users to create
- `seedPosts(userIds, postsPerUser)` - posts per user
- `seedThreads(userIds, threadsPerUser)` - threads per user
- `generatePostContent()` - post content distribution and data

Requires `DATABASE_URL` environment variable to be set.

## Posts CRUD

Posts are stored in the `posts` table with a `jsonb` `content` column so the payload can represent text posts, polls, visualizations, and other future content types.

Routes are defined in `@repo/rest-contracts` and implemented in `src/posts/posts.controller.ts`.
