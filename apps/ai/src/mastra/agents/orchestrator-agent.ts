import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import type { AIContextPayload } from "@repo/shared-dto";
import { getSocialMcpToolsets } from "../mcp/social";
import { getSearchMcpToolset } from "../mcp/search";
import { REASONING_AGENT_CONFIG } from "./reasoning-agent";
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
): Promise<Agent> {
  const orchestratorModelConfig = getOrchestratorModelConfig(mode);
  // ── 1. Fetch per-request MCP toolsets ──────────────────────────────────
  const { identityToolset, postsToolset, interactionsToolset } =
    await getSocialMcpToolsets(context);

  const searchToolset = await getSearchMcpToolset();
  const getContextTool = createGetContextTool(userContext);

  // ── 2. Build specialised sub-agents with their tools baked in ──────────

  const identityAgent = new Agent({
    id: "identity-agent",
    name: "Identity Agent",
    description:
      "Handles user identity and social-graph operations: who the current user is, profile lookups, following and unfollowing users, and listing followers or followings. Use this agent for any identity- or relationship-related task after the orchestrator has resolved vague, multi-step, or navigation-heavy requests with the reasoning agent.",
    instructions: `You are the identity specialist for a social media platform.

Your responsibilities:
- Identify who the current user is using the whoami tool
- Look up any user's public profile (follower/following counts, post count, bio)
- Follow or unfollow users on behalf of the current user
- List who follows a given user, and who that user follows

Guidelines:
- If the request is vague, requires multiple coordinated steps, or needs frontend navigation, ask the orchestrator to consult the reasoning agent before acting
- Always use whoami before performing actions that need the current user's ID
- Be concise — return only the information requested
- When listing followers/following, present them as a clean list
- Do not attempt to create, read, update, or delete posts; delegate that elsewhere`,
    model: MODEL_CONFIG.IDENTITY_AGENT.model,
    tools: identityToolset,
  });

  const postCreationAgent = new Agent({
    id: "post-creation-agent",
    name: "Post Creation Agent",
    description:
      "Handles write operations on posts: creating new posts, updating the text of existing posts, and deleting posts. Use this agent whenever the user wants to publish, edit, or remove content after the orchestrator has resolved vague, multi-step, or navigation-heavy requests with the reasoning agent. Does NOT handle comments or reactions.",
    instructions: `You are the content publishing specialist for a social media platform.

Your responsibilities:
- Create new text posts on behalf of the current user
- Update the text content of posts the current user has authored
- Delete posts the current user has authored

Guidelines:
- If the request is vague, requires multiple coordinated steps, or needs frontend navigation, ask the orchestrator to consult the reasoning agent before acting
- Only the post author can update or delete a post; the backend enforces this
- When creating a post, use the exact text the user provides — do not paraphrase
- After creating or updating a post, confirm success and return the post ID
- After deleting a post, confirm the deletion by post ID
- Do not read or list posts, fetch threads, or handle comments/reactions; delegate that elsewhere`,
    model: MODEL_CONFIG.POST_CREATION_AGENT.model,
    tools: postsToolset,
  });

  const postDiscoveryAgent = new Agent({
    id: "post-discovery-agent",
    name: "Post Discovery Agent",
    description:
      "Handles read operations on posts: browsing the recommended feed and reading full post threads with their comments. Use this agent to discover content, summarize the feed, or inspect a specific post and its discussion after the orchestrator has resolved vague, multi-step, or navigation-heavy requests with the reasoning agent.",
    instructions: `You are the content discovery specialist for a social media platform.

Your responsibilities:
- Fetch and summarise the recommended post feed (up to 50 posts, default 10)
- Read a specific post thread — the post itself and all its comments
- Help the user discover relevant content or understand a discussion

Guidelines:
- If the request is vague, requires multiple coordinated steps, or needs frontend navigation, ask the orchestrator to consult the reasoning agent before acting
- Present feed results in a readable format: author, post text, reaction counts
- When reading a thread, clearly separate the post from its comments
- If the user wants to react to or comment on a post, delegate that to the interactions agent
- If the user wants to create, update, or delete a post, delegate that to the post-creation agent
- Be concise — summarise long content instead of dumping raw text`,
    model: MODEL_CONFIG.POST_DISCOVERY_AGENT.model,
    tools: postsToolset,
  });

  const interactionsAgent = new Agent({
    id: "interactions-agent",
    name: "Interactions Agent",
    description:
      "Handles all engagement and interaction operations: commenting on posts (including nested replies), upvoting or downvoting posts, and removing reactions. Use this agent whenever the user wants to respond to, react to, or engage with content after the orchestrator has resolved vague, multi-step, or navigation-heavy requests with the reasoning agent.",
    instructions: `You are the engagement specialist for a social media platform.

Your responsibilities:
- Post comments on any post on behalf of the current user
- Post nested replies by supplying the parent comment ID
- Upvote or downvote posts (an existing reaction of a different type is replaced automatically)
- Remove the current user's reaction from a post

Guidelines:
- If the request is vague, requires multiple coordinated steps, or needs frontend navigation, ask the orchestrator to consult the reasoning agent before acting
- When commenting, use the exact text the user provides — do not paraphrase
- Confirm the comment ID after successfully creating a comment
- When reacting, confirm whether the reaction was created or replaced a previous one
- Do not read or list posts; if the user needs to see a thread first, ask the orchestrator to use the post-discovery agent
- Do not create or modify posts; delegate that to the post-creation agent`,
    model: MODEL_CONFIG.INTERACTIONS_AGENT.model,
    tools: interactionsToolset,
  });

  const searchAgent = new Agent({
    ...SEARCH_AGENT_CONFIG,
    model: MODEL_CONFIG.SEARCH_AGENT.model,
    tools: searchToolset,
  });

  const reasoningAgent = new Agent({
    ...REASONING_AGENT_CONFIG,
    model: MODEL_CONFIG.REASONING_AGENT.model,
  });

  // ── 3. Build the orchestrator (supervisor) ─────────────────────────────

  const orchestrator = new Agent({
    id: "orchestrator",
    name: "Orchestrator",
    instructions: `You are the orchestrator for a social media AI assistant. Route work to specialist agents, use direct UI tools when needed, and synthesize final answers. Do not call social media tools yourself.

Agents: identity-agent for identity/social graph; post-creation-agent for post writes; post-discovery-agent for feed/thread reads; interactions-agent for comments/reactions; search-agent for web search; reasoning-agent for vague prompts, planning, navigation, trade-offs, synthesis, and plan revisions.

Direct tools: open_form, set_form_field, submit_form, get_current_context, create_plan, update_plan_item.

Rules:
- If the request is vague, multi-step, needs navigation, or has side effects that require planning, consult reasoning-agent first. Continue that back-and-forth until the objective, missing info, navigation path, and execution order are clear.
- If the user refers to what is on screen, call get_current_context and include it in the reasoning-agent or specialist handoff.
- Use form tools directly for visible UI form work; otherwise delegate platform operations to the relevant specialist agent.
- Use create_plan only after reasoning-agent recommends a user-approved plan. Do not execute planned steps until the user approves; then update each step with update_plan_item as work starts and completes.
- Confirm write operations with IDs, present read results clearly, and report specialist failures plainly.`,
    model: orchestratorModelConfig.model,
    agents: {
      identityAgent,
      postCreationAgent,
      postDiscoveryAgent,
      interactionsAgent,
      searchAgent,
      reasoningAgent,
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
