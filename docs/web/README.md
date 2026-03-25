# Web App — Overview

React 19 SPA. Twitter/X-style social feed: auth, post composition (text/poll/visualization), reactions, user profiles.

## Commands

```bash
pnpm --filter web dev        # dev server (alias: serve)
pnpm --filter web build      # tsc -b && vite build
pnpm --filter web lint
```

## Stack

| Concern       | Choice                                   | Notes                                                       |
| ------------- | ---------------------------------------- | ----------------------------------------------------------- |
| Routing       | TanStack Router (file-based)             | auto-generates `src/routeTree.gen.ts` — never edit          |
| Server state  | TanStack Query                           | configured; not yet used in queries — add new ones here     |
| Client state  | Jotai v2                                 | custom store for imperative access outside React            |
| Forms         | TanStack Form + Zod                      | per-field `safeParse`, no global adapter                    |
| Auth          | `better-auth` via `@repo/auth-client`    | JWT persisted via `atomWithStorage`                         |
| API           | `@ts-rest/core` + `@repo/rest-contracts` | fully typed from Zod schemas                                |
| UI primitives | `@base-ui/react` (NOT Radix)             | shadcn `base-lyra` style, CVA variants                      |
| Styling       | Tailwind CSS v4 (Vite plugin)            | no `tailwind.config.js`; OKLCH design tokens in `index.css` |
| Icons         | `@tabler/icons-react` (NOT Lucide)       |                                                             |
| Theme         | `next-themes` class-based                | `"light"` / `"dark"` / `"system"`                           |

## Directory Layout

```
src/
  main.tsx                  # entry: createRouter + <Providers> (QueryClient + Jotai)
  index.css                 # Tailwind v4 + OKLCH tokens + JetBrains Mono font
  routeTree.gen.ts          # AUTO-GENERATED — never edit
  routes/
    __root.tsx              # ThemeProvider + layout switch (auth/* → form, else AppLayout)
    index.tsx               # /
    profile.tsx             # /profile (auth-gated)
    auth/{login,register,forgot-password,reset-password}.tsx
  components/
    providers.tsx           # QueryClientProvider + JotaiProvider
    layout/                 # AppLayout, LeftSidebar, RightSidebar, MainContent, UserProfile
    ui/                     # shadcn/base-ui primitives (Button, Input, Dialog, …)
    *-form.tsx              # auth forms
    edit-profile-dialog.tsx
  hooks/use-session.ts      # authClient.useSession() wrapper
  lib/
    auth.ts                 # login / register / logout / forgotPassword / resetPassword / updateProfile
    utils.ts                # cn() — clsx + twMerge
    query-client.ts         # QueryClient singleton (staleTime 5m, gcTime 10m, retry 1)
    api/auth.ts             # ts-rest client init (baseUrl: "/")
    atoms/store.ts          # Jotai createStore() singleton
    atoms/bearer-token.ts   # atomWithStorage("bearer_token") — persisted JWT
```

## Workspace Dependencies

- `@repo/auth-client` → `packages/auth-client`
- `@repo/rest-contracts` → `packages/rest-contracts`

## Further Reading

- [ARCHITECTURE.md](./ARCHITECTURE.md) — routing, state, auth flow, forms, UI patterns
- [CONFIG.md](./CONFIG.md) — Vite, TypeScript, Tailwind, shadcn, env vars
- [API.md](./API.md) — ts-rest client usage and contract reference
