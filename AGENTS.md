Agent Guide for Thesis Repository

This repository is a hybrid monorepo: TypeScript (React + NestJS). It uses pnpm workspaces, Nx for orchestration and Just for convenience scripts. Agents use this file as the canonical handbook for commands, conventions, and safe behaviors.

Read `docs/` before changing architecture or contracts — it prevents duplicate discovery and class of mistakes.

Quick commands (build / lint / test)

- Root setup: `pnpm install` or `just setup` (restores Node tooling).
- Start dev services: `just dev` (preferred when present).

- TypeScript apps (pnpm workspaces / nx):
  - Build: `pnpm --filter <app-name> build` (e.g. `pnpm --filter web build`).
  - Lint: `pnpm --filter <app-name> lint` (e.g. `pnpm --filter backend lint`).
  - Test (all): `pnpm --filter <app-name> test` (runs the test script defined in that package).
  - Run single test file (Vitest): `pnpm --filter backend test -- test/<path>/file.spec.ts`.
  - Run single test by name: `pnpm --filter backend test -- -t "test name"`.
  - Run Vitest directly (bypass npm script): `pnpm --filter backend -- vitest run test/<path>/file.spec.ts`.

- Web (React + Vite):
  - Dev: `pnpm --filter web dev` or `pnpm --filter web serve`.
  - Build: `pnpm --filter web build` (runs `tsc -b && vite build`).

- Backend (NestJS):
  - Build: `pnpm --filter backend build` (runs `nest build`).
  - Test: `pnpm --filter backend test` ; watch: `pnpm --filter backend test:watch`.

Tips: prefer `just` wrappers where available. Use `pnpm -w -s tsc --build` for cross-project type checks.

How to run a single test (cheat sheet)

- Single file (Vitest): `pnpm --filter backend test -- test/<path>/file.spec.ts`.
- By test name: `pnpm --filter backend test -- -t "name"`.
- Watch a single test: `pnpm --filter backend test -- --watch -t "name"`.

Code style and standards (TypeScript / Frontend)

- Formatting & linting:
  - Prettier required. Repo defaults: 2 spaces, double quotes, semicolons. Run `prettier --check` in CI and `prettier --write` locally.
  - ESLint enforces TS/React/Nest rules. Run `pnpm --filter <app> lint`. Use `--fix` when safe; document why you bypass rules with an inline comment linking a ticket.

- TypeScript rules:
  - `strict` mode ON. Avoid `any`; prefer `unknown` then narrow. Use `eslint`/`tsc` to catch missed `any`.
  - Prefer `readonly` for immutable fields and `as const` for constant literal shapes.
  - Use Zod for schema parsing/validation at external boundaries; keep shared DTOs in `packages/shared-dto` and update consumers on change.

- Imports:
  - Order imports: external -> workspace packages (`@org/*` or `packages/*`) -> app aliases -> relative imports.
  - Separate groups with a blank line; verify via ESLint `import/order` autofix.
  - Prefer path aliases to deep relative imports.

- Naming & files:
  - Files: `kebab-case.ts` / `kebab-case.tsx`.
  - React components: `PascalCase`. Prefer named exports for easier refactors.
  - Hooks: `useSomething` (camelCase). Keep small hooks colocated with components.
  - Constants: `UPPER_SNAKE_CASE` for compile-time constants; runtime exported values use `camelCase` or `PascalCase`.

- React patterns & state:
  - Prefer function components and hooks; split heavy components into presentational + container.
  - Use TanStack Query for server cache/state; colocate queries, cache keys, and types with consumers.
  - Forms: use TanStack Form + zod. Create zod schemas, infer types (`z.infer<>`) and wire a resolver.
  - Accessibility: semantic HTML, minimal ARIA, keyboard support and visible focus states.

- Validation & runtime checks:
  - Parse external inputs early with Zod and convert to domain types.
  - Validate server inputs in controllers/services and return typed errors.

- Error handling:
  - Do not swallow errors. Throw or return typed/domain errors and let global handlers format messages.
  - Prefer custom Error subclasses or discriminated unions for domain errors.
  - In NestJS controllers/services throw `HttpException` (or domain-specific exceptions) rather than returning raw objects.
  - Log contextual data (request id, user id) but never log secrets or PII.

  - Use `shadcn` primitives for base components. Import via workspace alias in `apps/web/components.json` (e.g. `@/components/ui`).
  - Add primitives with the shadcn CLI from inside `web`: `pnpm --filter web exec shadcn add <component>`.

Imports, formatting and commits (general)

- Keep imports tidy. Rely on ESLint and project linters.
- Run `prettier --write` for TypeScript changes before committing. CI enforces formatting checks.
- Agents MUST NOT commit automatically unless explicitly asked. If asked, create small focused commits explaining the why.

Agent rules & workflows

- Explore first: use `glob` and `grep` to locate files and confirm where changes belong before editing.
- Non-destructive edits: do not revert or overwrite unrelated changes in the working tree.
- DTO sync: when changing backend-facing DTOs update `packages/shared-dto` and rebuild both consumer and producer.
- Verify: run affected project's `build` + `test` and workspace typecheck `pnpm -w -s tsc --build` before finishing.

CI / tooling notes

- CI should run `pnpm install`, `pnpm --filter <app> lint`, and `pnpm --filter <app> test` for TypeScript apps.
- Keep test runs focused to speed feedback; use `--filter` and run single-file tests when possible.

Cursor / Copilot rules

- Cursor rules: I searched for `.cursor/rules/` and `.cursorrules` — none found in the repo. If you add them, agents must surface and follow them.
- GitHub Copilot instructions: `.github/copilot-instructions.md` not present. If added, agents should include and follow guidance from it.

Useful paths

- `apps/web/package.json` - web scripts and deps
- `apps/web/components.json` - shadcn component registry / alias
- `apps/backend/package.json` - backend scripts and vitest config
- `apps/backend/src` - NestJS controllers/services
- `packages/shared-dto` - shared TypeScript DTOs
- `packages/auth-client` - auth client helpers

Documentation references

- `docs/backend/README.md`, `docs/backend/CONFIG.md`, `docs/backend/ARCHITECTURE.md`, `docs/backend/API.md`, `docs/backend/DATABASE.md`.
- `docs/web/README.md`, `docs/web/CONFIG.md`, `docs/web/ARCHITECTURE.md`, `docs/web/API.md`.

Practical checklist for agents (short)

- After edits run: `pnpm --filter <app> build && pnpm --filter <app> test` for the affected project.
- For cross-cutting changes run workspace typecheck: `pnpm -w -s tsc --build`.
- When adding forms: wire TanStack Form + zod and add validation unit tests early.

Nx guidance

- Use the `nx-workspace` skill to inspect projects and targets. Prefer `nx` targets (`nx run`, `nx affected`) over calling underlying tools directly.
- Prefix nx commands with the package manager (e.g. `pnpm nx build`) to avoid relying on a global CLI.
- For scaffolding/generators invoke the `nx-generate` skill first.
