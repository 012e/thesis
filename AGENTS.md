# Agent Guide for Thesis Repository

This repository is a Hybrid Monorepo containing TypeScript (React, NestJS) and .NET (C#) projects. It uses pnpm, Nx, and Just for workspace, build, and task automation. Agents use this guide to build, test, lint, and follow repository conventions.

1. Quick commands (build / lint / test)

- Root: install deps: `pnpm install` or `just setup` (restores .NET + Node tooling).
- Start all dev services: `just dev`.

- TypeScript apps (pnpm workspaces / nx):
  - Build an app: `pnpm --filter <app-name> build` (example: `pnpm --filter web build`).
  - Lint an app: `pnpm --filter <app-name> lint` (example: `pnpm --filter auth lint`).
  - Run all tests for an app: `pnpm --filter <app-name> test` (when the script exists).
  - Run a single Vitest file (example for `auth`):
    `pnpm --filter auth test -- test/auth/some.spec.ts`.
  - Run a single test by name: `pnpm --filter auth test -- -t "should do X"` (Vitest `-t`).
  - Run Vitest directly: `pnpm --filter auth -- vitest run test/auth/some.spec.ts`.

- Web (React + Vite):
  - Dev server: `pnpm --filter web dev` or `pnpm --filter web serve`.
  - Build: `pnpm --filter web build` (runs `tsc -b && vite build`).

- Auth (NestJS):
  - Build: `pnpm --filter auth build` (runs `nest build`).
  - Tests: `pnpm --filter auth test` / watch: `pnpm --filter auth test:watch`.

- .NET projects (Backend.Api, Database.Models):
  - Build solution: `dotnet build thesis.sln` or `dotnet build apps/backend/Backend.Api`.
  - Restore: `dotnet restore`.
  - Format: `dotnet format`.
  - Run all tests: `dotnet test`.
  - Run a specific project tests: `dotnet test apps/backend/Backend.Api`.
  - Run a single test (by fully qualified name):
    `dotnet test --filter "FullyQualifiedName~Namespace.Class.Method"`.

Notes: prefer `just` wrappers when available (`just setup`, `just db-migrate`). Always run the minimal target that verifies your change (project-level build/test).

2. How to run a single test (common examples)

- Vitest single file: `pnpm --filter auth test -- test/<path>/file.spec.ts`.
- Vitest single test name: `pnpm --filter auth test -- -t "should do X"`.
- Vitest single test in watch mode: `pnpm --filter auth test -- --watch -t "should do X"`.
- dotnet single test method: `dotnet test --filter "FullyQualifiedName~Namespace.Class.Method"`.

3. TypeScript / Frontend code style and standards

- Formatting: Prettier is required. Repo defaults: 2 spaces, double quotes, semicolons. Run `prettier --check` in CI and `prettier --write` locally.
- Linting: ESLint (TS/React/Nest). Run `pnpm --filter <app> lint`. Use `--fix` when safe. Add rule exceptions only with a clear comment and a linked ticket.
- TypeScript: `strict` mode is on. Avoid `any`; prefer `unknown` then narrow. Use `readonly` for immutable fields and prefer `as const` for literal shapes.

- Imports:
  - Order: external packages -> workspace packages (packages/_ or @org/_) -> app absolute imports -> relative imports.
  - Keep imports grouped and sorted; use ESLint `import/order` rules. Avoid deep relative paths when aliases exist.
  - Use path aliases only when declared in `tsconfig.json` and supported by build tooling.

- Naming & files:
  - Files: `kebab-case.ts` / `.tsx` for components.
  - React components: `PascalCase`. Prefer named exports for easier testing and refactors.
  - Hooks: `useSomething` (camelCase). Place in `hooks/` or next to component when small.
  - Constants: `UPPER_SNAKE_CASE` only for compile-time constants; use `camelCase` or `PascalCase` for exported values.

- React patterns and state:
  - Prefer function components and hooks.
  - Use TanStack Query for server state; colocate queries, cache keys, and types near consuming components.
  - Forms: must use TanStack Form + zod for schema validation. Create a `zod` schema, infer types (`z.infer<>`), and use a resolver with TanStack Form. Validate on submit and optionally on blur.
  - Keep components small and split large components into presentational + container when logic grows.
  - Accessibility: include ARIA roles, semantic HTML, keyboard support and visible focus states.

- Validation & runtime checks:
  - Use `zod` for all external input parsing and validation on both client and server.
  - Parse input early and convert to domain types after validation.

- Error handling:
  - Do not swallow errors. Throw or return typed errors and let global handlers produce user-facing messages.
  - Prefer custom Error subclasses or discriminated unions for domain errors.
  - In NestJS controllers/services: throw `HttpException` (or domain-specific exceptions) instead of raw objects.
  - Log contextual information (request id, user id) but never log secrets or PII.

- UI components & shadcn:
  - Use `shadcn` components for primitives (Button, Input, Select, Dialog, Tooltip, Dropdown, Card, Badge, Avatar, Form controls).
  - Use the workspace alias defined in `apps/web/components.json` (e.g., `"ui": "@/components/ui"`) and import from `@/components/ui`.
  - Add primitives with the shadcn CLI inside the `web` workspace: `pnpm --filter web exec shadcn add <component>`.

4. C# / .NET style and standards

- Project style: file-scoped namespaces, implicit usings, and top-level statements where appropriate.
- DTOs: prefer `record` for immutable DTOs and simple transport objects.
- Naming:
  - Types and members: `PascalCase`.
  - Method parameters and locals: `camelCase`.
  - Interfaces prefixed with `I` (e.g., `IUserRepository`).
- DI & async:
  - Use constructor injection. Register services in the composition root (`Program.cs`).
  - Always use `async/await` for async methods. Accept `CancellationToken` on public/entry async methods and forward it.
- Logging & errors:
  - Use structured logging. Avoid string concatenation for logs; prefer structured properties.
  - Map domain exceptions to HTTP status codes in middleware and avoid leaking internal details.

5. Imports, formatting and commits (general)

- Imports: keep them tidy. Rely on ESLint and dotnet analyzers to enforce ordering and unused import rules.
- Formatting: run `prettier --write` for TypeScript changes and `dotnet format` for C# before committing. CI enforces formatting checks.
- Commits: agents must NOT commit automatically unless explicitly asked. If asked to commit, create small focused commits that explain the why and what.

6. Agent rules & workflows

- Explore First: use `glob` and `grep` to find files and confirm where to change before editing.
- Non-destructive edits: do not revert or overwrite unrelated changes in the working tree.
- DTO sync: when changing C# DTOs in `packages/database/Database.Models` or `apps/backend`, update `packages/shared-dto` and rebuild both sides.
- Migrations: changing EF models requires migrations. Use `just db-add-migration <Name>` then `just db-migrate`.
- Verification: always run the project-level build + tests for the project you changed. Fix lint/type errors before finishing.

7. CI / tooling notes

- Ensure CI runs `pnpm install`, `pnpm --filter <app> lint`, `pnpm --filter <app> test` for TS apps and `dotnet test` for C# projects.
- Keep test runs focused (project-level) to speed feedback. Add caching for node_modules / nuget where appropriate.

8. Cursor / Copilot rules

- Cursor rules: none found in repository (no `.cursor/rules/` or `.cursorrules`). If such files are added later, agents must surface and follow them.
- GitHub Copilot instructions: not found (`.github/copilot-instructions.md` missing). If added later, replicate important guidance here and follow the file.

9. Useful paths

- `apps/web/package.json` - web scripts and deps
- `apps/web/components.json` - shadcn component registry / alias
- `apps/auth/package.json` - auth scripts and vitest config
- `apps/auth/src` - NestJS controllers/services
- `packages/database/Database.Models` - EF Core models (C#)
- `packages/shared-dto` - shared TypeScript DTOs

10. Practical guidance for agents (short checklist)

- Run minimal verifying commands after changes: `pnpm --filter <app> build && pnpm --filter <app> test` or `dotnet test apps/backend/Backend.Api`.
- When adding forms: wire TanStack Form + zod early, add unit tests for validation, and include type inference (`z.infer`).
- For UI changes: prefer adding storybook stories or visual tests; update `apps/web/components.json` if adding shared primitives.
- For cross-cutting changes: run workspace typecheck: `pnpm -w -s tsc --build`.

If you want me to update anything (add stricter lint rules, CI config, or a PR checklist), tell me which area to modify.

11. Website stylistic choices

- Theme: dark-themed, high-contrast, minimalist; "Modern Retro" / terminal-inspired aesthetic that favors a monospace look and a coder-first vibe.
- Typography: prefer monospace-style fonts for primary UI text; reserve a humanist sans for long-form content only when necessary.
- Colors: deep black/onyx background, bright cyan/electric blue accents, subtle purples for secondary indicators, muted greys for low-contrast metadata.
- Layout: three-column social layout (left nav, center feed, right sidebar); use thin dividers and generous vertical rhythm.
- Components: rounded buttons/avatars to soften the terminal feel; keep borders minimal and focus on content hierarchy via color and spacing.
