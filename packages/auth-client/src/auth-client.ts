import { createAuthClient } from "better-auth/react";
import {
  usernameClient,
  jwtClient,
  adminClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [usernameClient(), jwtClient(), adminClient()],
});

export type AuthClient = typeof authClient;

export function createCustomAuthClient(
  config?: Parameters<typeof createAuthClient>[0],
): AuthClient {
  return createAuthClient({
    baseURL: "http://localhost:3000",
    plugins: [usernameClient(), jwtClient(), adminClient()],
    ...config,
  }) as AuthClient;
}
