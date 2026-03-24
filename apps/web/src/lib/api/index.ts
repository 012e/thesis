import { initClient } from "@ts-rest/core";
import { authContract } from "@repo/auth-contracts";
import { env } from "@/env";

export const client = initClient(authContract, {
  baseUrl: env.VITE_BACKEND_URL,
  baseHeaders: {},
  credentials: "include",
});
