# Web App — API

Two client layers:

- **ts-rest** (`src/lib/api/auth.ts`) — typed client for all app endpoints, inferred from `@repo/auth-contracts`
- **better-auth** (`@repo/auth-client`) — auth flows (session, sign-in/up, password reset)

## ts-rest Client

```ts
// src/lib/api/auth.ts
export const client = initClient(authContract, { baseUrl: "/" });

// Usage pattern — always narrow on status
const res = await client.listPosts({
  headers: { Authorization: `Bearer ${token}` },
});
if (res.status === 200) res.body; // Post[]
```

Returns `{ status, body, headers }`. Types are inferred — no manual casting needed.

## better-auth Client

```ts
import { authClient } from "@repo/auth-client";

authClient.signIn.email({ email, password });
authClient.signUp.email({ name, email, password });
authClient.token(); // → { data: { token: string } }
authClient.signOut();
authClient.useSession(); // React hook → { data: session }
authClient.forgetPassword({ email, redirectTo });
authClient.resetPassword({ newPassword, token });
authClient.updateUser({ name, image });
```

Base URL hardcoded to `http://localhost:3000` in `packages/auth-client/src/auth-client.ts`.

## TanStack Query Integration Pattern

```ts
function authHeaders() {
  const token = store.get(bearerToken);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const postsQueryOptions = queryOptions({
  queryKey: ["posts"],
  queryFn: async () => {
    const res = await client.listPosts({ headers: authHeaders() });
    if (res.status !== 200) throw new Error("failed");
    return res.body;
  },
});
```
