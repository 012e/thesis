import { Mastra } from "@mastra/core";

import { env } from "../env";
import { assistantAgent } from "./agents/assistant";
import { socialMediaAgent } from "./agents/social-media-agent";
import { agentSkillsAgent } from "./agents/agent-skills-agent";
import { postCreationAgent } from "./agents/post-creation-agent";
import { postDraftingAgent } from "./agents/post-drafting-agent";
import { navigationAgent } from "./agents/navigation-agent";
import { planningAgent } from "./agents/planning-agent";
import { searchAgent } from "./agents/search-agent";
import { pgStore } from "./memory";
import { streamRoute } from "./routes/stream";
import { healthRoute } from "./routes/health";
import { RequestContext } from "@mastra/core/request-context";

/**
 * Mastra server instance.
 *
 * Registered agents:
 * - assistantAgent  — legacy single-agent (kept for Mastra Studio compat)
 * - socialMediaAgent — consolidated backend specialist: identity, discovery,
 *                      engagement, post management, tags (Studio preview only)
 * - agentSkillsAgent — the user's reusable agent-skill library (Studio preview only)
 * - postCreationAgent — post write ops (Studio preview only)
 * - postDraftingAgent — LinkedIn-style and technical question drafting
 * - navigationAgent — app page/tool discovery (Studio preview only)
 * - planningAgent   — explicit execution planning with the strongest model
 * - searchAgent     — web search via OpenAI web search
 *
 * Note: the sub-agents registered here have NO tools attached because MCP
 * toolsets require per-request auth. The live /chat route uses
 * `createOrchestratorAgent(context)` which builds all agents fresh per
 * request with the correct auth-aware toolsets injected at construction time.
 */
export const mastra = new Mastra({
  agents: {
    assistantAgent,
    socialMediaAgent,
    agentSkillsAgent,
    postCreationAgent,
    postDraftingAgent,
    navigationAgent,
    planningAgent,
    searchAgent,
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
        // Health endpoint is unauthenticated — skip auth gate
        if (c.req.path === "/health") {
          await next();
          return;
        }

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
    apiRoutes: [healthRoute, streamRoute],
  },
});
