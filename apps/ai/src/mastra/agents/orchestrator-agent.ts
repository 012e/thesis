import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import type { AIContextPayload } from "@repo/shared-dto";
import { PROMPTS } from "../../prompts";
import { getSocialMcpToolsets } from "../mcp/social";
import { NAVIGATION_AGENT_CONFIG } from "./navigation-agent";
import { POST_CREATION_AGENT_CONFIG } from "./post-creation-agent";
import { POST_DRAFTING_AGENT_CONFIG } from "./post-drafting-agent";
import { PLANNING_AGENT_CONFIG } from "./planning-agent";
import { SEARCH_AGENT_CONFIG } from "./search-agent";
import { SOCIAL_MEDIA_AGENT_CONFIG } from "./social-media-agent";
import {
  getOrchestratorModelConfig,
  MODEL_CONFIG,
  type ModelMode,
} from "../constants";
import { createPlanTool, updatePlanItemTool } from "../tools/plan";
import { createGetContextTool } from "../tools/context";

/**
 * Creates a fully wired orchestrator agent for a single HTTP request.
 *
 * Because MCP toolsets carry per-request auth tokens, sub-agents cannot be
 * constructed once at module load time. Instead this factory:
 *
 * 1. Fetches all five MCP toolsets using the current request's auth context.
 * 2. Constructs the consolidated social-media-agent with all five toolsets
 *    merged in, plus the tool-free/content sub-agents (drafting, search,
 *    navigation, planning).
 * 3. Returns an orchestrator (supervisor) agent that has all sub-agents
 *    registered. Use `stepJudgeAgent` separately to evaluate whether the
 *    orchestrator fully completed the user's requested steps.
 *
 * The orchestrator delegates autonomously based on each sub-agent's
 * `description`.
 *
 * @param context - The per-request context carrying auth tokens.
 * @param mode - Interaction mode: "fast" uses the fast orchestrator model;
 *   "thinking" uses the reasoning orchestrator model. Sub-agent models are
 *   dedicated per agent and do not change by mode. Defaults to "fast".
 */
export async function createOrchestratorAgent(
  context: RequestContext,
  mode: ModelMode = "fast",
  userContext?: AIContextPayload,
): Promise<Agent> {
  const orchestratorModelConfig = getOrchestratorModelConfig(mode);
  // ── 1. Fetch per-request MCP toolsets ──────────────────────────────────
  const {
    identityToolset,
    postsToolset,
    interactionsToolset,
    postManagementToolset,
    tagsToolset,
  } = await getSocialMcpToolsets(context);

  const getContextTool = createGetContextTool(userContext);

  // ── 2. Build specialised sub-agents with their tools baked in ──────────

  // Consolidated backend specialist owning identity, discovery, engagement,
  // post management, and tags — all five MCP toolsets merged into one agent.
  // Tool names are unique across the MCP servers, so the spread cannot collide.
  const socialMediaAgent = new Agent({
    ...SOCIAL_MEDIA_AGENT_CONFIG,
    model: MODEL_CONFIG.SOCIAL_MEDIA_AGENT.model,
    tools: {
      ...identityToolset,
      ...postsToolset,
      ...interactionsToolset,
      ...postManagementToolset,
      ...tagsToolset,
    },
  });

  const postCreationAgent = new Agent({
    ...POST_CREATION_AGENT_CONFIG,
    model: MODEL_CONFIG.POST_CREATION_AGENT.model,
    tools: postsToolset,
  });

  const postDraftingAgent = new Agent({
    ...POST_DRAFTING_AGENT_CONFIG,
    model: MODEL_CONFIG.POST_DRAFTING_AGENT.model,
  });

  const searchAgent = new Agent({
    ...SEARCH_AGENT_CONFIG,
    model: MODEL_CONFIG.SEARCH_AGENT.model,
  });

  const navigationAgent = new Agent({
    ...NAVIGATION_AGENT_CONFIG,
    model: MODEL_CONFIG.NAVIGATION_AGENT.model,
  });

  const planningAgent = new Agent({
    ...PLANNING_AGENT_CONFIG,
    model: MODEL_CONFIG.PLANNING_AGENT.model,
    agents: {
      navigationAgent,
    },
  });

  // ── 3. Build the orchestrator (supervisor) ─────────────────────────────

  const orchestrator = new Agent({
    id: "orchestrator",
    name: "Orchestrator",
    instructions: PROMPTS.orchestrator,
    model: orchestratorModelConfig.model,
    agents: {
      socialMediaAgent,
      // postCreationAgent,
      postDraftingAgent,
      searchAgent,
      navigationAgent,
      planningAgent,
    },
    tools: {
      get_current_context: getContextTool,
      create_plan: createPlanTool,
      update_plan_item: updatePlanItemTool,
    },
  });

  return orchestrator;
}
