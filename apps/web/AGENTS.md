# Toin Web Agent Guide

## Overview

React 19/Vite frontend for Toin, a social platform and thesis implementation.
It uses strict TypeScript, TanStack Router/Query, Jotai, ts-rest, Better Auth,
Tailwind CSS v4, Storybook/MSW, and assistant-ui.

- `src/routes/`: file-based pages; `-name.tsx` files are route-local helpers.
- `src/components/`: reusable features; `ui/` primitives and `layout/` shell.
- `src/hooks/`: queries, mutations, and shared behavior.
- `src/lib/api/`: ts-rest transport and HTTP status handling.
- `src/lib/atoms/`: shared Jotai state and singleton store.
- `src/lib/socket/`: shared token-keyed Socket.IO connections.
- `src/lib/chat/`, `src/lib/assistant/`: AI context, tools, and thread state.
- `src/stories/`, `.storybook/`: Storybook and contract-derived MSW mocks.

API schemas belong in `@repo/rest-contracts`; shared DTOs belong in
`@repo/shared-dto`. Do not invent frontend-only API shapes.

## Commands

Run from `thesis/`:

```sh
pnpm --filter web dev
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
pnpm --filter web storybook
pnpm --filter web build-storybook
```

Useful root commands: `just dev`, `just test-web`, `just storybook`, and
`just e2e`. Environment defaults are defined in `src/env.ts` and `.env.example`.

## Coding Rules

- Import app code through `@/` and contracts/DTOs through `@repo/*`.
- Add routes with `createFileRoute`. Never edit generated
  `src/routeTree.gen.ts`.
- Keep route-only code beside its route; move it only when reused.
- Put transport logic in `src/lib/api/`, expose it through Query hooks, and
  reuse existing query keys. Mutations must invalidate every affected view.
- TanStack Query owns server state; Jotai owns cross-tree UI state. Do not
  create another QueryClient, production Jotai store, or Socket.IO connection.
- Auth uses both cookies and a persisted bearer token. Preserve
  `credentials: "include"`, token propagation, and `handleAuthFailure()` on 401.
- Socket hooks attach/detach listeners but do not disconnect shared sockets on
  normal unmount.
- Keep AI page/post/profile context accurate when routes or visibility change.
- Use existing UI primitives and semantic theme tokens instead of raw colors.
- User-facing copy is English. TypeScript is strict and rejects unused values.

## Design Guide

The home feed is the visual reference: a dense, technical social dashboard,
not a rounded generic SaaS interface.

- Keep JetBrains Mono throughout the product.
- Use theme tokens from `src/index.css`: near-black dark surfaces, subtle
  borders, muted gray metadata, and cyan-blue `primary` for focus and actions.
- At `xl`, use the existing three-column shell: `17.1875rem` navigation,
  fluid content, and `21.875rem` context sidebar. Hide the right sidebar below
  `xl`; use the navigation drawer below `lg`.
- Sidebars and page controls are sticky. Top controls use
  `bg-background/80 backdrop-blur-md` with a bottom border.
- Build feeds as continuous full-width rows separated by borders. Typical
  spacing is `p-4` or `px-4 py-3`; avoid detached cards and structural shadows.
- Keep structural panels square-edged. Rounded shapes are mainly for avatars,
  badges, compact controls, and floating overlays.
- Use Tabler icons: approximately `size-7` for navigation and `size-4/5` for
  actions. Prefer existing button and UI variants.
- Use bold text for names, headings, and active controls; muted text for
  handles, timestamps, counts, and inactive states.
- Hover with subtle surface changes (`hover:bg-accent[/50]`). Keep motion short
  and functional; preserve keyboard focus and accessible labels.
- Posts use `p-4`, a `size-10` avatar, compact author metadata, readable body
  text, and a low-emphasis action row.
- Right-sidebar cards remain compact and border-led. Forms have one clear
  primary action and muted helper text.
- Check substantial UI changes in light/dark themes and at mobile, `lg`, and
  `xl` widths. Add or update Storybook stories for reusable components.

## State and Special Cases

- Only `/auth/*` is public; `AuthGuard` protects other routes.
- Infinite feeds use cursor pagination and flatten `data.pages`.
- New posts use Jotai plus `sessionStorage` for immediate feed placement;
  preserve deduplication against fetched pages.
- Incoming Socket.IO events invalidate Query caches.
- AI chat sends thread mode and serialized page context to Mastra.
- Playground layout is persisted; Swapy requires explicit destroy/update and
  stable wrappers because it moves DOM outside React ownership.

## Verification

Tests are `src/**/*.test.{ts,tsx}` using Vitest, jsdom, and Testing Library.
Storybook uses MSW; prefer contract-derived handlers.

For focused changes, run the affected test plus typecheck and lint. Before
handoff, normally run:

```sh
pnpm --filter web test
pnpm --filter web build
```

Also build Storybook for story/UI infrastructure changes and run Playwright E2E
for cross-page flows. Mock browser-only APIs such as storage,
`IntersectionObserver`, Monaco, and Swapy where needed.

## Pitfalls

- Rebuild changed workspace contracts/DTOs before diagnosing stale types.
- Cache invalidation must cover feeds, details, counters, admin lists, and
  notification/conversation summaries.
- Admin routes still require explicit role checks.
- Do not commit `dist/` or treat the generated route tree as normal source.
