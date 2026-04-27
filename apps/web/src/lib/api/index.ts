import { initClient, tsRestFetchApi, type ApiFetcherArgs } from "@ts-rest/core";
import { appContract } from "@repo/rest-contracts";
import { env } from "@/env";

/** Reads the bearer token synchronously from localStorage (set by bearerToken Jotai atom). */
function getBearerToken(): string | null {
  try {
    const raw = localStorage.getItem("bearer_token");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** Wraps the default ts-rest fetch to inject the Authorization bearer token. */
async function fetchWithAuth(args: ApiFetcherArgs) {
  const token = getBearerToken();
  return tsRestFetchApi({
    ...args,
    headers: {
      ...args.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export const client = initClient(appContract, {
  baseUrl: env.VITE_BACKEND_URL,
  baseHeaders: {},
  credentials: "include",
  validateResponse: true,
  api: fetchWithAuth,
});
