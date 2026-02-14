# Agent Guide for Thesis Repository

This repository is a **Hybrid Monorepo** containing **TypeScript (React, NestJS)** and **.NET (C#)** projects, managed with **pnpm**, **Nx**, and **Just**.

## 1. Environment & Commands

### Package Management

- **TypeScript:** Use **pnpm** exclusively.
  - Install dependency (root): `pnpm add -w <package>`
  - Install dependency (specific app): `pnpm --filter <app-name> add <package>`
- **.NET:** Use standard `dotnet` CLI.
  - Add package: `dotnet add <project-path> package <package-name>`
  - Restore: `dotnet restore` (or `just setup` to install everything)

### Build, Lint, & Test

#### TypeScript (Apps: `web`, `auth`)

- **Build:** `pnpm --filter <app-name> build`
- **Lint:** `pnpm --filter <app-name> lint`
- **Test:**
  - **Auth (NestJS):**
    - Run all: `pnpm --filter auth test`
    - Single File: `pnpm --filter auth test -- <path/to/test.spec.ts>`
  - **Web (React):**
    - _Note:_ If `test` script is missing in `package.json`, install `vitest` and add it.
    - Run: `pnpm --filter web test` (once configured)

#### .NET (Backend: `Backend.Api`, Libs: `Database.Models`)

- **Build:** `dotnet build <project-path>` or `dotnet build thesis.sln`
- **Format:** `dotnet format`
- **Test:**
  - Run all: `dotnet test`
  - Single Project: `dotnet test <project-path>`
  - Single Test: `dotnet test --filter "FullyQualifiedName~Namespace.Class.Method"`

### Task Automation (Justfile)

Use `just` for common workflows:

- `just setup`: Install all dependencies (Node & .NET).
- `just dev`: Start backend, frontend, and auth in parallel.
- `just db-migrate`: Apply EF Core migrations.

## 2. Code Style & Standards

### TypeScript - Frontend (`apps/web`)

- **Framework:** React 19 + Vite + TanStack Router.
- **Language:** TypeScript (Strict Mode, no `any`).
- **Formatting:** Prettier (2 spaces, double quotes, semi-colons).
- **Naming:**
  - Files: `kebab-case.ts` (e.g., `user-profile.tsx`).
  - Components: `PascalCase` (e.g., `UserProfile`).
  - Hooks: `camelCase` (prefix with `use`).
- **State:** Prefer **TanStack Query** for server state. Use React Context for minimal global UI state.
- **Routing:** Follow **TanStack Router** file-based routing conventions.

### TypeScript - Auth Service (`apps/auth`)

- **Framework:** NestJS.
- **Architecture:** Modular (Modules, Controllers, Services).
- **Naming:**
  - Classes: `PascalCase` (e.g., `AuthService`).
  - Files: `kebab-case.ts` (e.g., `auth.service.ts`).
- **Testing:** Vitest. Write `.spec.ts` files co-located with source or in `test/`.

### C# / .NET - Backend (`apps/backend`)

- **Version:** .NET 10 (Preview). Use modern C# features.
- **Style:**
  - **File-scoped namespaces:** `namespace Backend.Api.Controllers;`
  - **Implicit usings:** Rely on `GlobalUsings.cs` or project defaults.
  - **Records:** Use `public record UserDto(string Name, string Email);` for DTOs.
- **Naming:**
  - Classes/Methods: `PascalCase`.
  - Parameters/Locals: `camelCase`.
  - Interfaces: `IPascalCase`.
- **Async:** Always use `async/await`. **Never** use `.Result` or `.Wait()`.
- **Error Handling:** Use global exception middleware. Throw domain-specific exceptions.

## 3. Monorepo Structure & Behavior

### Directory Layout

- **`apps/web`**: React Frontend.
- **`apps/auth`**: NestJS Auth Service.
- **`apps/backend`**: .NET Web API (`Backend.Api`).
- **`packages/database`**: Shared C# EF Core models (`Database.Models`).
- **`packages/shared-dto`**: Shared TypeScript types (sync with backend DTOs).

### Agent Rules

1.  **Explore First:** Run `ls -F`, `grep`, or `glob` to locate files and understand context before editing.
2.  **Context Sync:**
    - If you change a C# DTO in `Backend.Api` or `Database.Models`, **immediately** update the corresponding TypeScript interface in `packages/shared-dto` or the frontend types to maintain synchronization.
3.  **Database Changes:**
    - Modifying `Database.Models` requires a migration.
    - Run: `just db-add-migration <MigrationName>` then `just db-migrate`.
4.  **Verification:**
    - **Always** run the build/test command for the specific project you modified before marking a task as done.
    - **Do not** break the build. Fix lint errors immediately.

## 4. Specific Tooling Instructions

- **TanStack Router:** Use the generated route tree. Run the dev server to auto-update route definitions.
- **NestJS:** Adhere to dependency injection patterns. Do not bypass the module system.
- **EF Core:** Use Code-First migrations. Do not modify the database schema manually.
