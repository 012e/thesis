import store from "@/lib/atoms/store";
import bearerToken from "@/lib/atoms/bearer-token";
import { authClient } from "@/lib/auth";

/**
 * Check if the user has a valid bearer token
 */
export function isAuthenticated(): boolean {
  const token = store.get(bearerToken);
  console.log(token);
  return !!token;
}

/**
 * Get the current bearer token
 */
export function getToken(): string | null | undefined {
  return store.get(bearerToken);
}

/**
 * Clear the bearer token and sign out
 */
export async function logout() {
  store.set(bearerToken, null);
  await authClient.signOut();
}
