import { Mastra } from "@mastra/core";

import { env } from "../env";
import { assistantAgent } from "./agents/assistant";
import { identityAgent } from "./agents/identity-agent";
import { postCreationAgent } from "./agents/post-creation-agent";
import { postDiscoveryAgent } from "./agents/post-discovery-agent";
import { interactionsAgent } from "./agents/interactions-agent";
import { pgStore } from "./memory";
import { streamRoute } from "./routes/stream";
import { RequestContext } from "@mastra/core/request-context";

/**
 * Mastra server instance.
 *
 * Registered agents:
 * - assistantAgent  — legacy single-agent (kept for Mastra Studio compat)
 * - identityAgent   — user identity & social graph (Studio preview only)
 * - postCreationAgent — post write ops (Studio preview only)
 * - postDiscoveryAgent — post read ops (Studio preview only)
 * - interactionsAgent — engagement ops (Studio preview only)
 *
 * Note: the sub-agents registered here have NO tools attached because MCP
 * toolsets require per-request auth. The live /chat route uses
 * `createOrchestratorAgent(context)` which builds all agents fresh per
 * request with the correct auth-aware toolsets injected at construction time.
 */
export const mastra = new Mastra({
  agents: {
    assistantAgent,
    identityAgent,
    postCreationAgent,
    postDiscoveryAgent,
    interactionsAgent,
  },
  storage: pgStore,
  server: {
    port: env.PORT,
    cors: {
      origin: "*",
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "Origin",
        "User-Agent",
        "Accept",
      ],
    },
    middleware: [
      async (c, next) => {
        const context = c.get("requestContext") as RequestContext;
        if (!context) {
          throw new Error("Context must be available");
        }
        const authHeader = c.req.header("Authorization");
        const token = authHeader?.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : undefined;
        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }
        context.set("authorization", token);

        await next();
      },
    ],
    apiRoutes: [streamRoute],
  },
});
