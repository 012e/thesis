# Agent Guide for Thesis Repository

This repository is a **Hybrid Monorepo** containing both **TypeScript (React)** and **.NET (C#)** projects, managed with **pnpm** and **Nx**.
All coding agents operating in this repository must adhere to the guidelines below.

## 1. Environment & Commands

### Package Management
- **TypeScript:** Use **pnpm** exclusively.
  - Install dependency (root): `pnpm add -w <package>`
  - Install dependency (specific app): `pnpm --filter <app-name> add <package>`
- **.NET:** Use standard `dotnet` CLI or NuGet.
  - Add package: `dotnet add <project-path> package <package-name>`
  - Restore: `dotnet restore`

### Build, Lint, & Test

#### TypeScript (Apps & Packages)
Commands are run via `pnpm` filters or `nx`.
- **Build:** `pnpm --filter <package-name> build`
- **Dev Server:** `pnpm --filter web dev`
- **Lint:** `pnpm --filter <package-name> lint`
- **Test:**
  - *Note: If a `test` script is missing, add it using Vitest.*
  - Run: `pnpm --filter <package-name> test`
  - Single File: `pnpm --filter <package-name> test -- <path/to/test.ts>`

#### .NET (Backend & Libraries)
- **Build:** `dotnet build <project-path>` or `dotnet build thesis.sln`
- **Test:**
  - Run all: `dotnet test`
  - Single Project: `dotnet test <project-path>`
  - Single Test: `dotnet test --filter "FullyQualifiedName~Namespace.Class.Method"`
- **Format:** `dotnet format`

## 2. Code Style & Standards

### TypeScript (Frontend - `apps/web`)
- **Framework:** React 19 + Vite + TanStack Router.
- **Strict Mode:** Strict type checking enabled. No `any`.
- **Formatting:** Prettier (2 spaces, double quotes, semi-colons).
- **Naming:**
  - Files: `kebab-case.ts` (e.g., `user-profile.tsx`)
  - Components: `PascalCase` (e.g., `UserProfile`)
  - Functions/Vars: `camelCase`
- **State:** Prefer React Context or TanStack Query over global state libraries unless necessary.
- **Styling:** Use Tailwind CSS (if configured) or CSS Modules.

### C# / .NET (Backend - `apps/backend`)
- **Version:** .NET 10 (Preview/RC). Use modern C# features.
- **Style:**
  - Use **file-scoped namespaces** (`namespace My.Namespace;`).
  - Use **implicit usings** where possible.
  - Use **records** for DTOs and immutable data structures.
- **Naming:**
  - Classes/Methods/Properties: `PascalCase`.
  - Local variables/Parameters: `camelCase`.
  - Interfaces: `IPascalCase`.
- **Async:** Always use `async/await`. Avoid `.Result` or `.Wait()`.
- **Error Handling:** Use global exception handling middleware. Throw custom exceptions for domain logic errors.

## 3. Monorepo Structure

### `apps/`
- **`web/`**: TypeScript/React frontend application.
- **`backend/`**: .NET Web API (`Backend.Api`).

### `packages/`
- **`shared-dto/`**: Shared TypeScript types/interfaces (likely corresponding to backend DTOs).
- **`database/`**: Shared C# database models/entities (`Database.Models`).

## 4. Agent Behavior Rules

1. **Explore First:** Always analyze the codebase (`ls -R`, `grep`, `glob`) to understand existing patterns before writing code.
2. **Context Awareness:**
   - If working on **Frontend**: Check `apps/web/package.json` for dependencies.
   - If working on **Backend**: Check `.csproj` files for NuGet packages.
3. **Atomic Changes:** Keep changes focused. Do not mix refactoring with feature work.
4. **Verification:**
   - **TS:** Run `pnpm build` and `pnpm lint` before finishing.
   - **.NET:** Run `dotnet build` to ensure no compilation errors.
5. **Testing:**
   - If tests exist, run them.
   - If adding a new feature, add a corresponding test (Vitest for TS, xUnit/NUnit for .NET).
6. **No Broken Windows:** Do not introduce linting warnings or compilation errors. Fix them immediately.

## 5. Specific Tooling Instructions

- **TanStack Router:** Use file-based routing conventions in `apps/web`.
- **Database:** Changes to `packages/database` (C# models) may require migrations. Check for EF Core usage.
- **DTO Sync:** If you modify C# DTOs in `Backend.Api` or `packages/database`, ensure corresponding TypeScript types in `packages/shared-dto` are updated to match.
