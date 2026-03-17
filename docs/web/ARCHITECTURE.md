# Web App — Architecture

## Provider / Layout Tree

```
<Providers>              QueryClientProvider + JotaiProvider (custom store)
  <RouterProvider>
    __root.tsx           ThemeProvider
      /auth/*  →  plain full-screen form layout
      /*       →  <AppLayout>
                    LeftSidebar | MainContent | RightSidebar
```

## Routing

File-based via TanStack Router. Vite plugin writes `src/routeTree.gen.ts` — never edit it.

Adding a route: create `src/routes/my-page.tsx` with:

```ts
export const Route = createFileRoute("/my-page")({ component: MyPage });
```

Navigation: `<Link to="/profile">` or `router.navigate({ to: "/profile" })`.

Auth-gating: currently done inside component body via `useSession()` + `<Navigate>`. Preferred going forward:

```ts
export const Route = createFileRoute("/protected")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: "/auth/login" });
  },
  component: ProtectedPage,
});
```

Query params: `const { token } = useSearch({ strict: false })`.

## State (Jotai)

Custom store (`src/lib/atoms/store.ts`) allows imperative access outside React:

```ts
store.get(bearerToken); // read outside component
store.set(bearerToken, value); // write outside component
useAtomValue(bearerToken); // read inside component
```

`bearerToken` = `atomWithStorage<string | null | undefined>("bearer_token", undefined)` — backed by `localStorage`.

New atoms → `src/lib/atoms/<name>.ts`.

## Auth Flow

```
form.onSubmit → lib/auth.ts#login(email, password)
  → authClient.signIn.email(…)
  → authClient.token()           // get JWT
  → store.set(bearerToken, jwt)  // persist
  → navigate("/")
```

Auth actions in `src/lib/auth.ts`: `login`, `register`, `logout`, `isAuthenticated`, `forgotPassword`, `resetPassword`, `sendVerificationEmail`, `updateProfile`.

Session inside components: `const { data: session } = useSession()` → `session.user.{name,email,image}`.

Attaching JWT to ts-rest calls: `headers: { Authorization: \`Bearer ${store.get(bearerToken)}\` }`.

## Forms (TanStack Form + Zod)

```tsx
const form = useForm({
  defaultValues: { email: "", password: "" },
  onSubmit: async ({ value }) => { /* call auth fn, navigate */ },
});

<form.Field name="email" validators={{ onChange: ({ value }) => {
  const r = schema.shape.email.safeParse(value);
  return r.success ? undefined : r.error.issues[0]?.message;
}}}>
  {(field) => <Field>…<Input …/>{field.state.meta.errors}</Field>}
</form.Field>

<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
  {([ok, loading]) => <Button disabled={!ok || loading}>Submit</Button>}
</form.Subscribe>
```

Rules: field-level validation only; no global Zod adapter; use `form.Subscribe` for submit state.

## UI Components

Primitives use `@base-ui/react` (not Radix). Variants via CVA in `src/components/ui/variants.ts`.

Available in `src/components/ui/`: `Button` (CVA variants: default/destructive/outline/ghost/link, sizes: default/sm/lg/icon), `Input`, `Field`+`FieldLabel`, `Card`, `Badge`, `Avatar`, `Dialog`, `DropdownMenu`, `ScrollArea`, `Separator`, `Toaster` (Sonner), `PostComposer`.

Layout in `src/components/layout/`: `AppLayout` (3-col shell), `LeftSidebar`, `RightSidebar`, `MainContent` (max-w-600px), `UserProfile` (avatar dropdown).

## Server State (TanStack Query)

Infrastructure in place; no active `useQuery`/`useMutation` hooks yet — all fetching is still imperative. Use TanStack Query for all new data interactions:

```ts
// src/lib/queries/posts.ts
export const postsQueryOptions = queryOptions({
  queryKey: ["posts"],
  queryFn: async () => {
    const res = await client.listPosts({ headers: authHeaders() });
    if (res.status !== 200) throw new Error("failed");
    return res.body;
  },
});
```

Colocate `queryOptions` factories near the feature. Keep query keys typed.
