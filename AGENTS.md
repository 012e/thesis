# Agent Guide for Thesis Repository

This repository is a **TypeScript Monorepo** managed with **pnpm**.
All coding agents operating in this repository must adhere to the guidelines below to ensure consistency, stability, and maintainability.

## 1. Environment & Commands

### Package Management
- Use **pnpm** exclusively.
- **Install dependencies:**
  - Root: `pnpm add -w <package>`
  - Specific package: `pnpm add --filter <package-name> <dependency>`
  - Internal dependency: `pnpm add --filter <app-name> <workspace-package-name>`

### Build, Lint, & Test
Since this is a monorepo, commands can be run from the root or scoped to specific packages.

- **Build:**
  - All: `pnpm build`
  - Single: `pnpm --filter <package-name> build`
- **Lint:**
  - All: `pnpm lint`
  - Single: `pnpm --filter <package-name> lint`
- **Test:**
  - All: `pnpm test`
  - Single: `pnpm --filter <package-name> test`
  - **Single Test File:** `pnpm --filter <package-name> test -- <path/to/test.ts>`
  - **Watch Mode:** `pnpm --filter <package-name> test -- --watch`

*Note: If specific scripts are missing in a package's `package.json`, agents are expected to add them following the standard `vitest` and `eslint` patterns.*

## 2. Code Style & Standards

### TypeScript
- **Strict Mode:** strict type checking must be enabled in `tsconfig.json`.
- **No `any`:** Avoid `any` types. Use `unknown`, generics, or Zod schemas for validation.
- **Interfaces vs Types:** Use `interface` for public API definitions and `type` for unions/intersections.

### Formatting & Naming
- **Formatting:** Adhere to Prettier defaults (2 spaces indentation, semi-colons, double quotes).
- **Files:** `kebab-case.ts` (e.g., `user-profile.ts`).
- **Directories:** `kebab-case` (e.g., `components/auth-form/`).
- **Variables/Functions:** `camelCase`.
- **Classes/Components/Interfaces:** `PascalCase`.
- **Constants:** `UPPER_SNAKE_CASE` for global constants.

### Imports
- Use named imports over default imports where possible.
- Use absolute imports (path aliases) if configured (e.g., `@repo/ui/button`).
- Group imports:
  1. External dependencies (e.g., `react`, `zod`)
  2. Internal workspace packages (e.g., `@repo/ui`)
  3. Local imports (relative paths)

### Error Handling
- Use `try/catch` blocks for async operations.
- Throw typed errors or custom Error classes, not strings.
- Ensure errors are logged or handled at the boundary layers (API handlers, UI components).

### Testing
- **Framework:** Vitest (preferred) or Jest.
- **Location:** Co-locate tests with source files (e.g., `utils.ts` -> `utils.test.ts`) or use a `__tests__` directory.
- **Coverage:** Aim for high coverage on utility functions and shared logic.

## 3. Monorepo Structure
- **apps/**: Deployable applications (Next.js, Express, etc.).
- **packages/**: Shared libraries (UI kits, utilities, types, configs).
- **Configuration:** Shared configs (eslint, tsconfig) should live in `packages/config` or similar and be extended by apps.

## 4. Agent Behavior Rules
1. **Explore First:** Before modifying code, search for existing utilities or patterns using `grep` or `glob`.
2. **Atomic Changes:** Keep changes focused. If a refactor is needed, do it in a separate step/PR.
3. **Verify:** Always run `pnpm build` and `pnpm test` for the affected package before finishing a task.
4. **Self-Correction:** If a build/test fails, analyze the error output, fix the issue, and verify again.
5. **No Blind Copy-Paste:** Understand the context. Do not introduce unused imports or duplicate logic.

## 5. Specific Tooling Instructions
- **React (if used):** Functional components + Hooks. Avoid Class components.
- **State Management:** Prefer React Context or lightweight libraries (Zustand) over Redux unless necessary.
- **Styling:** Tailwind CSS is preferred if a styling solution is not already established.
