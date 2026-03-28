import { initClient } from "@ts-rest/core";
import { appContract } from "@repo/rest-contracts";
import { env } from "@/env";

export const client = initClient(appContract, {
  baseUrl: env.VITE_BACKEND_URL,
  baseHeaders: {},
  credentials: "include",
  validateResponse: true,
});
