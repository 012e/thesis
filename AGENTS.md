Agent Guide for Thesis Repository

This repository is a hybrid monorepo: TypeScript (React + NestJS). It uses pnpm workspaces, Nx for orchestration and Just for convenience scripts. This document provides concise commands, code-style rules, and agent workflows for automated agents and contributors.

**🚀 START HERE: Before exploring or making changes, read the project documentation in `docs/` to understand the full project structure, architecture, and conventions. This saves context and prevents redundant discovery.**

Quick commands (build / lint / test)

- Root setup: `pnpm install` or `just setup` (restores Node tooling).
- Start dev services: `just dev`.

- TypeScript apps (pnpm workspaces / nx):
  - Build: `pnpm --filter <app-name> build` (e.g. `pnpm --filter web build`).
  - Lint: `pnpm --filter <app-name> lint` (e.g. `pnpm --filter backend lint`).
  - Test (all): `pnpm --filter <app-name> test` (if script exists).
  - Single Vitest file: `pnpm --filter backend test -- test/<path>/file.spec.ts`.
  - Single test by name: `pnpm --filter backend test -- -t "should do X"`.
  - Run Vitest directly: `pnpm --filter backend -- vitest run test/<path>/file.spec.ts`.

- Web (React + Vite):
  - Dev: `pnpm --filter web dev` or `pnpm --filter web serve`.
  - Build: `pnpm --filter web build` (runs `tsc -b && vite build`).

- Backend (NestJS):
  - Build: `pnpm --filter backend build` (runs `nest build`).
  - Tests: `pnpm --filter backend test`; watch: `pnpm --filter backend test:watch`.

Prefer `just` wrappers when present. Run the minimal project-level target that verifies your change.

How to run a single test (cheat sheet)

- Single file: `pnpm --filter backend test -- test/<path>/file.spec.ts`.
- By test name: `pnpm --filter backend test -- -t "name"`.
- Watch one test: `pnpm --filter backend test -- --watch -t "name"`.

Code style and standards (TypeScript / Frontend)

- Formatting & linting:
  - Prettier required. Repo defaults: 2 spaces, double quotes, semicolons. Use `prettier --check` in CI and `prettier --write` locally.
  - ESLint enforces TS/React/Nest rules. Run `pnpm --filter <app> lint`. Use `--fix` when safe; document exceptions with inline comment + ticket.

- TypeScript rules:
  - `strict` mode ON. Avoid `any`; prefer `unknown` then narrow.
  - Prefer `readonly` for immutable fields and `as const` for literal shapes.
  - Prefer domain types and `zod` schemas at boundaries. Keep shared DTOs in `packages/shared-dto`.

- Imports:
  - Order: external -> workspace packages (`@org/*` or `packages/*`) -> app aliases -> relative imports.
  - Separate groups with a blank line; enforce via ESLint `import/order`.
  - Avoid deep relative imports when aliases exist.

- Naming & files:
  - File names: `kebab-case.ts` / `kebab-case.tsx`.
  - React components: `PascalCase`, prefer named exports.
  - Hooks: `useSomething` (camelCase). Keep small hooks near components.
  - Constants: `UPPER_SNAKE_CASE` for compile-time constants; exported runtime values use `camelCase` or `PascalCase`.

- React patterns and state:
  - Prefer function components and hooks. Split heavy components into presentational + container.
  - Use TanStack Query for server state; colocate queries, cache keys, and types near consumers.
  - Forms: use TanStack Form + zod. Create zod schemas, infer types (`z.infer<>`) and wire a resolver.
  - Accessibility: semantic HTML, ARIA only where needed, keyboard support and visible focus states.

- Validation & runtime checks:
  - Use `zod` for parsing/validating external inputs on client and server.
  - Parse early and convert to domain types after validation.

- Error handling:
  - Never swallow errors. Throw or return typed/domain errors and let global handlers produce user-facing messages.
  - Prefer custom Error subclasses or discriminated unions for domain errors.
  - In NestJS controllers/services throw `HttpException` (or domain-specific exceptions) rather than raw objects.
  - Log contextual data (request id, user id) but never log secrets or PII.

- UI primitives & shadcn:
  - Use `shadcn` primitives for base components. Import via workspace alias in `apps/web/components.json` (e.g. `@/components/ui`).
  - Add primitives with the shadcn CLI from inside `web`: `pnpm --filter web exec shadcn add <component>`.

.NET / C# guidelines

- Project style: prefer file-scoped namespaces, implicit usings and top-level statements when appropriate.
- DTOs: prefer `record` for immutable DTOs; keep shared DTOs in `packages/shared-dto`.
- Naming: types and members `PascalCase`; parameters and locals `camelCase`; interfaces start with `I`.
- DI & async: use constructor injection; register services in `Program.cs`. Use `async/await` and accept `CancellationToken` on public async APIs.
- Logging & errors: use structured logging; map domain exceptions to HTTP status codes and avoid leaking internal details.

Imports, formatting and commits (general)

- Keep imports tidy. Rely on ESLint and dotnet analyzers.
- Run `prettier --write` for TypeScript changes and `dotnet format` for C# before committing. CI enforces formatting checks.
- Agents MUST NOT commit automatically unless explicitly asked. If asked, create small focused commits explaining the why.

Agent rules & workflows

- Explore first: use `glob` and `grep` to find files and confirm where changes belong before editing.
- Non-destructive edits: do not revert or overwrite unrelated changes in the working tree.
- DTO sync: when changing backend-facing DTOs update `packages/shared-dto` and rebuild both consumer and producer.
- Verification: always run the project-level `build` + `test` for changed projects and fix lint/type errors before finishing.

CI / tooling notes

- CI should run `pnpm install`, `pnpm --filter <app> lint`, and `pnpm --filter <app> test` for TypeScript apps.
- Keep test runs focused to speed feedback; add caching for node_modules / nuget where appropriate.

Cursor / Copilot rules

- Cursor rules: none found in repository (no `.cursor/rules/` or `.cursorrules`). If such files are added, agents must surface and follow them.
- GitHub Copilot instructions: not found (`.github/copilot-instructions.md` missing). If added later, replicate important guidance here and follow it.

Useful paths

- `apps/web/package.json` - web scripts and deps
- `apps/web/components.json` - shadcn component registry / alias
- `apps/backend/package.json` - backend scripts and vitest config
- `apps/backend/src` - NestJS controllers/services
- `packages/shared-dto` - shared TypeScript DTOs
- `packages/auth-client` - auth client helpers

Backend documentation (AI-oriented reference)

- `docs/backend/README.md` - overview, quick commands, and feature module summary
- `docs/backend/CONFIG.md` - environment variable reference and production checklist
- `docs/backend/ARCHITECTURE.md` - module graph, request lifecycle, auth design, testing strategy
- `docs/backend/API.md` - complete HTTP endpoint reference (Better Auth + ts-rest contract)
- `docs/backend/DATABASE.md` - schema tables/views, migration commands, and conventions

Web documentation (AI-oriented reference)

- `docs/web/README.md` - overview, stack, directory layout, commands
- `docs/web/CONFIG.md` - Vite, TypeScript, Tailwind v4, shadcn, env vars
- `docs/web/ARCHITECTURE.md` - routing, state (Jotai), auth flow, forms, UI components
- `docs/web/API.md` - ts-rest client usage, full contract table, better-auth client, Zod types

Practical checklist for agents (short)

- After edits run: `pnpm --filter <app> build && pnpm --filter <app> test` for the affected project.
- For cross-cutting changes run workspace typecheck: `pnpm -w -s tsc --build`.
- When adding forms: wire TanStack Form + zod and add validation unit tests early.

If you want stricter rules (pre-commit hooks, CI gates, PR checklist) tell me which area to tighten and I will update this file.

<!-- nx configuration start -->
<!-- Leave the start & end comments to automatically receive updates. -->

Nx guidance

- Use the `nx-workspace` skill to inspect projects and targets. Prefer `nx` targets (`nx run`, `nx affected`) over calling underlying tools directly.
- Prefix nx commands with the package manager (e.g. `pnpm nx build`) to avoid relying on a global CLI.
- For scaffolding/generators invoke the `nx-generate` skill first.

<!-- nx configuration end -->
