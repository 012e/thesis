import { registerApiRoute } from "@mastra/core/server";

export const healthRoute = registerApiRoute("/health", {
  method: "GET",
  handler: async (c) => c.json({ status: "ok" }),
});
