import { createAuthClient } from "better-auth/react";
import { usernameClient, jwtClient } from "better-auth/client/plugins";

export type AuthClient = ReturnType<typeof createAuthClient>;

export function createCustomAuthClient(
  config?: Parameters<typeof createAuthClient>[0],
): AuthClient {
  // 2. Annotate the function return
  return createAuthClient({
    baseURL: "http://localhost:3000",
    plugins: [usernameClient(), jwtClient()],
    ...config,
  });
}

export const authClient = createCustomAuthClient();
