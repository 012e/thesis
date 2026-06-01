import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import type { ToolSet } from "ai";
import type { AIContextPayload } from "@repo/shared-dto";
import { PROMPTS } from "../../prompts";
import { getSocialMcpToolsets } from "../mcp/social";
import { getSearchMcpToolset } from "../mcp/search";
import { IDENTITY_AGENT_CONFIG } from "./identity-agent";
import { INTERACTIONS_AGENT_CONFIG } from "./interactions-agent";
import { NAVIGATION_AGENT_CONFIG } from "./navigation-agent";
import { POST_CREATION_AGENT_CONFIG } from "./post-creation-agent";
import { POST_DISCOVERY_AGENT_CONFIG } from "./post-discovery-agent";
import { PLANNING_AGENT_CONFIG } from "./planning-agent";
import { SEARCH_AGENT_CONFIG } from "./search-agent";
import {
  getOrchestratorModelConfig,
  MODEL_CONFIG,
  type ModelMode,
} from "../constants";
import { openFormTool, setFormFieldTool, submitFormTool } from "../tools/forms";
import { createPlanTool, updatePlanItemTool } from "../tools/plan";
import { createGetContextTool } from "../tools/context";

/**
 * Creates a fully wired orchestrator agent for a single HTTP request.
 *
 * Because MCP toolsets carry per-request auth tokens, sub-agents cannot be
 * constructed once at module load time. Instead this factory:
 *
 * 1. Fetches all three MCP toolsets (identity, posts, interactions) using the
 *    current request's auth context.
 * 2. Constructs specialised sub-agents, each receiving only the subset of
 *    tools that belongs to its domain.
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
  clientTools?: ToolSet,
): Promise<Agent> {
  const orchestratorModelConfig = getOrchestratorModelConfig(mode);
  // ── 1. Fetch per-request MCP toolsets ──────────────────────────────────
  const { identityToolset, postsToolset, interactionsToolset } =
    await getSocialMcpToolsets(context);

  const searchToolset = await getSearchMcpToolset();
  const getContextTool = createGetContextTool(userContext);

  // ── 2. Build specialised sub-agents with their tools baked in ──────────

  const identityAgent = new Agent({
    ...IDENTITY_AGENT_CONFIG,
    model: MODEL_CONFIG.IDENTITY_AGENT.model,
    tools: identityToolset,
  });

  const postCreationAgent = new Agent({
    ...POST_CREATION_AGENT_CONFIG,
    model: MODEL_CONFIG.POST_CREATION_AGENT.model,
    tools: postsToolset,
  });

  const postDiscoveryAgent = new Agent({
    ...POST_DISCOVERY_AGENT_CONFIG,
    model: MODEL_CONFIG.POST_DISCOVERY_AGENT.model,
    tools: postsToolset,
  });

  const interactionsAgent = new Agent({
    ...INTERACTIONS_AGENT_CONFIG,
    model: MODEL_CONFIG.INTERACTIONS_AGENT.model,
    tools: interactionsToolset,
  });

  const searchAgent = new Agent({
    ...SEARCH_AGENT_CONFIG,
    model: MODEL_CONFIG.SEARCH_AGENT.model,
    tools: searchToolset,
  });

  const navigationAgent = new Agent({
    ...NAVIGATION_AGENT_CONFIG,
    model: MODEL_CONFIG.NAVIGATION_AGENT.model,
  });

  const planningAgent = new Agent({
    ...PLANNING_AGENT_CONFIG,
    model: MODEL_CONFIG.PLANNING_AGENT.model,
  });

  // ── 3. Build the orchestrator (supervisor) ─────────────────────────────

  const orchestrator = new Agent({
    id: "orchestrator",
    name: "Orchestrator",
    instructions: PROMPTS.orchestrator,
    model: orchestratorModelConfig.model,
    agents: {
      identityAgent,
      postCreationAgent,
      postDiscoveryAgent,
      interactionsAgent,
      searchAgent,
      navigationAgent,
      planningAgent,
    },
    tools: {
      open_form: openFormTool,
      set_form_field: setFormFieldTool,
      submit_form: submitFormTool,
      get_current_context: getContextTool,
      create_plan: createPlanTool,
      update_plan_item: updatePlanItemTool,
    },
  });

  return orchestrator;
}
