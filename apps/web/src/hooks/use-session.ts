import { authClient } from "@repo/auth-client";

export function useSession() {
  return authClient.useSession();
}
