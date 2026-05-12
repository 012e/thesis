# Web App — Configuration

## Vite (`vite.config.ts`)

```ts
plugins: [TanStackRouterVite(), react(), tailwindcss()]
resolve.alias: { "@": "./src" }
```

Plugin order is required: `TanStackRouterVite` must run first. No `server.proxy` — the web app reads the ts-rest `baseUrl` from `env.VITE_BACKEND_URL`; the Better Auth client currently hardcodes `http://localhost:3000`.

## TypeScript (`tsconfig.app.json`)

Key strict options beyond `strict: true`:

| Option                                  | Effect on agents                                              |
| --------------------------------------- | ------------------------------------------------------------- |
| `noUnusedLocals` / `noUnusedParameters` | Unused imports/params break the build — remove them           |
| `erasableSyntaxOnly`                    | No `enum` or `namespace` — use `const` objects or union types |
| `moduleResolution: "bundler"`           | Required for Vite; enables bare specifier imports             |

Path alias `@/*` → `./src/*` declared in both `tsconfig.json` (IDE) and `tsconfig.app.json`.

## Tailwind CSS v4

No `tailwind.config.js`. Config lives entirely in `src/index.css`:

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));   /* class-based dark mode */
:root  { --font-sans: "JetBrains Mono Variable", monospace; --primary: oklch(…); … }
.dark  { --primary: oklch(…); … }
```

All semantic color tokens use OKLCH. When adding colors, use OKLCH values to match.

## shadcn (`components.json`)

```json
{
  "style": "base-lyra",
  "iconLibrary": "tabler",
  "tailwind": { "cssVariables": true }
}
```

- `base-lyra` → uses `@base-ui/react` (not Radix). Do not introduce Radix dependencies.
- `iconLibrary: "tabler"` → scaffolded code uses `@tabler/icons-react`, not Lucide.
- Add components: `pnpm --filter web exec shadcn add <name>` → writes to `src/components/ui/`.

## Environment Variables

Validated at startup via `@t3-oss/env-core` in `src/env.ts`. Always import `env` from there — never read `import.meta.env` directly.

```ts
import { env } from "@/env";
env.VITE_MASTRA_CHAT_URL; // validated string URL
```

| Variable               | Required | Default                      | Description                                   |
| ---------------------- | -------- | ---------------------------- | --------------------------------------------- |
| `VITE_MASTRA_CHAT_URL` | no       | `http://localhost:4111/chat` | Mastra AI chat endpoint                       |
| `VITE_BACKEND_URL`     | no       | `http://localhost:3000`      | Backend API base URL (used by ts-rest client) |

Empty strings are coerced to `undefined` (`emptyStringAsUndefined: true`). Use `.env.local` for local overrides (git-ignored); commit `.env.example` to document variables.

Additionally hardcoded (not yet env-driven):

| Value                   | Location                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `http://localhost:3000` | `packages/auth-client/src/auth-client.ts` (better-auth base URL)                              |
| `env.VITE_BACKEND_URL`  | `apps/web/src/lib/api/index.ts` (ts-rest client baseUrl; defaults to `http://localhost:3000`) |

Note: the workspace `package.json` includes both `@tabler/icons-react` and `lucide-react`, and also lists `radix-ui` as a dependency. The project prefers `@tabler/icons-react` and the shadcn `base-lyra` primitives (`@base-ui/react`) — avoid introducing Radix primitives or switching icon families without an intentional migration.
