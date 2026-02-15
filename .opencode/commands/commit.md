---
description: Create a new git commit with a clear, focused message
agent: build
model: github-copilot/gpt-5-mini
---

Create a new git commit that is small, focused and has a high-quality message.

Follow these steps and guidelines when preparing the commit:

- Inspect the working tree and stage only relevant files: `git status --porcelain`, `git diff --name-only`.
- Run relevant checks before committing (lint, tests, format). Examples: `pnpm --filter <app> lint && pnpm --filter <app> test` for JS/TS apps or `dotnet test` / `dotnet format` for .NET projects. Fix failures first.
- Keep the commit small and single-purpose; avoid mixing unrelated refactors or formatting changes with functional changes.
- Do not commit secrets or credentials. If a file contains sensitive data, remove it from the change and rotate the secret.

Commit message format (recommended):

```
type(scope): short summary (<=50 chars)

A concise paragraph explaining the reason for the change and any important details (wrap ~72 chars).
- If tests were added/updated, note that here.
- If a database model changed, note that a migration is required.

Footer: references, BREAKING CHANGE: details, or Co-authored-by lines if needed.
```

Types you can use: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`.

Example messages:

```
feat(auth): add email/password login

Add email/password authentication with TanStack Form + zod validation.
Includes unit tests for form validation and a migration to add `users.email`.

Refs: #123
```

```
fix(api): handle null owner in /repos endpoint

Guard against null owner values returned by the DB layer to avoid 500s.
Add unit test covering the null case.
```

Commands to run:

```
git add path/to/changed/file1 path/to/changed/file2
git commit -m "type(scope): short summary" -m "Longer explanation of what and why."
```

If pre-commit or CI hooks fail, do not bypass them. Fix the underlying issues and re-run the checks.

When asking the AI to create the commit, include:

- The list of changed files to stage (or `git status`/`git diff` output).
- The minimal, focused description of the change.

The AI should return:

- A recommended commit message (both short subject and longer body).
- The exact `git add` and `git commit` commands to run.
- A brief checklist of checks that were run (or that should be run) and any remaining failures.
