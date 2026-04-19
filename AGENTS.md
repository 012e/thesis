# Agent Guide — Thesis Repository

Hybrid monorepo: React 19 + NestJS + Mastra AI service. pnpm workspaces, Nx for orchestration, justfiles for convenience scripts.

**Read `docs/` before changing architecture or contracts.**

---

## Repo map (read this first)

```
apps/
  web/        React 19 + Vite SPA (package name: "web")
  backend/    NestJS REST API + MCP server (package name: "backend")
  ai/         Mastra AI agent service (package name: "ai")
packages/
  shared-dto/       @repo/shared-dto  — pure TS interface DTOs (no runtime)
  rest-contracts/   @repo/rest-contracts — ts-rest contracts + Zod schemas (built with tsup)
  auth-client/      @repo/auth-client — Better Auth client helpers
  web-e2e/          @repo/web-e2e — Playwright E2E for web
```

### Key source files to orient quickly

| What                                    | Where                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| Backend entrypoint                      | `apps/backend/src/main.ts`                                                   |
| Backend root module                     | `apps/backend/src/app.module.ts`                                             |
| Backend env vars                        | `apps/backend/src/env.ts`                                                    |
| Backend Drizzle schema                  | `apps/backend/src/db/schema.ts` (app), `src/db/auth-schema.ts` (Better Auth) |
| All API contracts (ts-rest + Zod)       | `packages/rest-contracts/src/index.ts` + `src/contracts/`                    |
| All shared DTOs                         | `packages/shared-dto/index.ts`                                               |
| Web entrypoint                          | `apps/web/src/main.tsx`                                                      |
| Web routes (auto-generated, never edit) | `apps/web/src/routeTree.gen.ts`                                              |
| Web env vars                            | `apps/web/src/env.ts`                                                        |
| AI service entrypoint                   | `apps/ai/src/mastra/index.ts`                                                |
| Auth flow                               | `apps/backend/src/auth/index.ts` (Better Auth instance)                      |

### Backend module layout

Feature modules under `apps/backend/src/`: `posts/`, `comments/`, `reactions/`, `follows/`, `polls/`, `users/`, `uploads/`, `threads/`, `playground/`, `seed/`, `health/`, `mcp/`.

Each feature: `*.controller.ts` (ts-rest handlers) + `*.service.ts` + `*.module.ts`. NestJS pattern — controllers are thin, services hold logic.

### Web route/component layout

```
apps/web/src/
  routes/          TanStack Router file-based routes
    __root.tsx     ThemeProvider + AuthGuard + AppLayout
    index.tsx      Home feed
    chat.tsx       AI chat page (assistant-ui + Mastra SSE)
    auth/          login, register, forgot-password, reset-password
  components/
    assistant-ui/  AI chat UI (chat-runtime-provider.tsx, thread.tsx, thread-list.tsx)
    layout/        AppLayout, sidebars
    ui/            shadcn primitives
  lib/
    api/           ts-rest client call modules (auth, posts, comments, etc.)
    atoms/         Jotai atoms (bearerToken stored in localStorage)
    chat/          thread-list-adapter.ts
```

---

## Architecture — must-know patterns

**API contract-first**: All HTTP routes defined once in `packages/rest-contracts` (ts-rest + Zod). Backend uses `@ts-rest/nest`; web uses ts-rest client. Never add routes outside the contract.

**Auth**: Better Auth (emailAndPassword + username + jwt + bearer plugins). JWT stored in localStorage via Jotai `atomWithStorage`. Web attaches it as `Authorization: Bearer <token>` to all API calls and to the AI chat transport.

**AI integration**: Mastra AI service (port 4111) exposes `/chat` SSE stream. Backend exposes three MCP servers at `/mcp/identity/sse`, `/mcp/posts/sse`, `/mcp/interactions/sse`. Mastra MCPClient connects per-request with the user's JWT.

**Database**: PostgreSQL via ParadeDB image (adds BM25 full-text search). Migration `0007_paradedb_bm25_search.sql` enables full-text search on posts. Use DrizzleORM — no raw SQL in services.

**DTO sync rule**: When changing any backend-facing DTO, update `packages/shared-dto` and rebuild consumers: `pnpm --filter @repo/shared-dto build`.

---

## Commands

### Setup & dev

```bash
just setup           # pnpm install
just dev             # serves web + backend + ai + rest-contracts in parallel
just up              # docker compose up -d (Postgres/ParadeDB + MinIO)
just down            # docker compose down
```

### Build

```bash
pnpm --filter web build           # tsc -b && vite build
pnpm --filter backend build       # nest build
pnpm --filter @repo/rest-contracts build  # tsup (dual CJS/ESM — must build before backend tests)
pnpm --filter @repo/shared-dto build      # tsc
 just build                         # cross-project build & typecheck (use this instead of running tsc directly)
```

### Test (backend — all tests are integration, no mocks)

```bash
pnpm --filter backend test                    # vitest run --silent (all suites)
pnpm --filter backend test:auth               # vitest run test/auth/
pnpm --filter backend test:posts              # vitest run test/posts/
pnpm --filter backend test:comments           # vitest run test/comments/
pnpm --filter backend test:follows            # vitest run test/follows/
pnpm --filter backend test:reactions          # vitest run test/reactions/
pnpm --filter backend test:users              # vitest run test/users/
pnpm --filter backend test:uploads            # vitest run test/uploads/
pnpm --filter backend test:polls              # vitest run test/polls/
pnpm --filter backend test:playground         # vitest run test/playground/
pnpm --filter backend test:app                # vitest run test/app.e2e-spec.ts

# Single file or named test
pnpm --filter backend test -- test/posts/posts.controller.e2e-spec.ts
pnpm --filter backend test -- -t "test name"

# Or via just (handles building deps first)
just test-posts      # builds shared-dto + rest-contracts then runs test:posts
just test-auth       # etc.
```

### Database

```bash
pnpm --filter backend db:generate  # drizzle-kit generate (creates SQL migration file)
pnpm --filter backend db:migrate   # drizzle-kit migrate (apply migrations)
pnpm --filter backend db:push      # drizzle-kit push (dev shortcut, no file created)
pnpm --filter backend db:studio    # open Drizzle Studio in browser
pnpm --filter backend auth:migrate # regenerate src/db/auth-schema.ts from Better Auth CLI
```

### E2E (web)

```bash
just e2e             # pnpm nx run web-e2e:e2e
just e2e-headed      # headed browser
just e2e-ui          # Playwright UI mode
```

### UI components (shadcn)

```bash
pnpm --filter web exec shadcn add <component>   # add shadcn component to web
```

---

## Testing quirks

- **All backend tests are integration** — no mocks. Each suite boots a real NestJS app against a real **ParadeDB container** (via Testcontainers). Docker must be running.
- Container lifecycle is shared via `test/global-setup.ts`. Per-suite NestJS app setup in `test/helpers/app.setup.ts`.
- **Build deps before running tests.** `packages/rest-contracts` and `packages/shared-dto` must be compiled first (`just test-<domain>` does this automatically; raw `pnpm --filter backend test` does not).
- Tests files are `*.e2e-spec.ts` in `apps/backend/test/`. The vitest config uses `maxWorkers: 1` and `fileParallelism: false` to prevent container conflicts.
- CI runs 10 parallel matrix jobs (one per domain). `just test-<domain>` is what CI calls.

---

## Adding a new feature (backend + web)

1. Add/update route contract in `packages/rest-contracts/src/contracts/<domain>.ts` and re-export from `src/index.ts`.
2. Add/update DTOs in `packages/shared-dto/index.ts` if needed.
3. Build packages: `pnpm --filter @repo/rest-contracts build && pnpm --filter @repo/shared-dto build`.
4. Add NestJS module (`*.module.ts`), controller (`*.controller.ts`), service (`*.service.ts`) in `apps/backend/src/<domain>/`. Import in `app.module.ts`.
5. If new DB table: add to `apps/backend/src/db/schema.ts`, then `pnpm --filter backend db:generate && pnpm --filter backend db:migrate`.
6. Add integration tests in `apps/backend/test/<domain>/<domain>.e2e-spec.ts`.
7. Add web API client in `apps/web/src/lib/api/<domain>.ts`.
8. Web routes use TanStack Router file-based routing — add files under `apps/web/src/routes/`. `routeTree.gen.ts` is auto-generated on `dev`/`build`, never edit it.
9. Forms: TanStack Form + Zod schema → infer type with `z.infer<>`.
10. Verify: `pnpm --filter backend build && just test-<domain> && pnpm --filter web build && just build`.

---

## Code conventions (non-obvious ones only)

- `kebab-case.ts` / `kebab-case.tsx` for filenames; `PascalCase` for React components (named exports).
- UI primitives use `@base-ui/react` (not Radix). Tailwind CSS v4. Import shadcn via `@/components/ui`.
- State: Jotai for global atoms, TanStack Query for server cache. No Redux or Context for data.
- Env vars validated at startup via `@t3-oss/env-core` in each app. Add new vars to `src/env.ts` and update `.env.example`.
- `strict: true` TS everywhere. No `any` — use `unknown` and narrow.
- In NestJS throw `HttpException` subclasses, not raw objects.
- Import order: external → `@repo/*` workspace → `@/` app alias → relative.

---

## Useful paths

| Path                           | Purpose                                           |
| ------------------------------ | ------------------------------------------------- |
| `docs/backend/ARCHITECTURE.md` | Module graph, request lifecycle, testing strategy |
| `docs/backend/DATABASE.md`     | DB schema, migration history, Drizzle commands    |
| `docs/web/ARCHITECTURE.md`     | Provider tree, routing, state, auth flow          |
| `apps/web/components.json`     | shadcn config / path alias                        |
| `docker-compose.yaml`          | Postgres (ParadeDB), MinIO services               |
| `justfile`                     | All convenience task definitions                  |
| `nx.json`                      | Nx target defaults and caching config             |

---

## Agent rules

- **Do not explore blindly.** Read this file + `docs/` first. Start coding after confirming which package and files to change.
- Non-destructive edits: never revert unrelated changes in the working tree.
- Do not commit unless explicitly asked.
- After any edit: run `pnpm --filter <app> build` + domain test + `just build` for cross-cutting changes.
- Use `nx-workspace` skill to inspect Nx project config before running `nx` commands.
