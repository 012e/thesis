import { createAuthClient } from "better-auth/react";
import { usernameClient, jwtClient } from "better-auth/client/plugins";

export function createCustomAuthClient(
  config?: Parameters<typeof createAuthClient>[0],
) {
  return createAuthClient({
    baseURL: "http://localhost:3000",
    plugins: [usernameClient(), jwtClient()],
    ...config,
  });
}
export const authClient = createCustomAuthClient();
