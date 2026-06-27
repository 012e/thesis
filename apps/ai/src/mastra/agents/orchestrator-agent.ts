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
import { DEEP_SEARCH_AGENT_CONFIG } from "./deep-search-agent";
import { SOCIAL_MEDIA_AGENT_CONFIG } from "./social-media-agent";
import { AGENT_SKILLS_AGENT_CONFIG } from "./agent-skills-agent";
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
 * 1. Fetches all six MCP toolsets using the current request's auth context.
 * 2. Constructs the consolidated social-media-agent (five toolsets merged in),
 *    the deep-search-agent (web research tools plus the posts/tags toolsets as
 *    internal sources), and the content/utility sub-agents (drafting, search,
 *    navigation, planning). The agent-skills-agent is no longer an orchestrator
 *    delegate — it is attached as a tool to the planning-agent so plans can
 *    reuse the user's saved skills.
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
    agentSkillsToolset,
  } = await getSocialMcpToolsets(context);

  const getContextTool = createGetContextTool(userContext);

  // ── 2. Build specialised sub-agents with their tools baked in ──────────

  // Consolidated backend specialist owning identity, discovery, engagement,
  // post management, and tags — five MCP toolsets merged into one agent.
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

  // The user's reusable agent-skill library. It is no longer a direct delegate
  // of the orchestrator; instead it is exposed as a tool to the planning agent
  // so plans can discover and reuse relevant saved skills while being built.
  const agentSkillsAgent = new Agent({
    ...AGENT_SKILLS_AGENT_CONFIG,
    model: MODEL_CONFIG.AGENT_SKILLS_AGENT.model,
    tools: agentSkillsToolset,
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

  // Deep-research specialist. Web research tools come from its config; the
  // platform's own posts and tags are merged in as internal sources so it can
  // mine on-platform content alongside the open web.
  const deepSearchAgent = new Agent({
    ...DEEP_SEARCH_AGENT_CONFIG,
    model: MODEL_CONFIG.DEEP_SEARCH_AGENT.model,
    tools: {
      ...DEEP_SEARCH_AGENT_CONFIG.tools,
      ...postsToolset,
      ...tagsToolset,
    },
  });

  const navigationAgent = new Agent({
    ...NAVIGATION_AGENT_CONFIG,
    model: MODEL_CONFIG.NAVIGATION_AGENT.model,
  });

  // Planning agent gets the agent-skills agent as a tool so plans can reuse the
  // user's saved skills, plus navigation-agent for UI/route decisions.
  const planningAgent = new Agent({
    ...PLANNING_AGENT_CONFIG,
    model: MODEL_CONFIG.PLANNING_AGENT.model,
    agents: {
      navigationAgent,
      agentSkillsAgent,
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
      deepSearchAgent,
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
