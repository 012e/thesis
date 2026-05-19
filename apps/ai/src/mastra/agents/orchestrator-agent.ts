import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import type { AIContextPayload } from "@repo/shared-dto";
import { getSocialMcpToolsets } from "../mcp/social";
import { getSearchMcpToolset } from "../mcp/search";
import { SEARCH_AGENT_CONFIG } from "./search-agent";
import {
  ModelMode,
  MODEL_FAST_ORCHESTRATOR,
  MODEL_FAST_SUB_AGENT,
  MODEL_THINKING_ORCHESTRATOR,
  MODEL_THINKING_SUB_AGENT,
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
 * 2. Constructs five specialised sub-agents, each receiving only the subset of
 *    tools that belongs to its domain.
 * 3. Returns an orchestrator (supervisor) agent that has all five sub-agents
 *    registered. Use `stepJudgeAgent` separately to evaluate whether the
 *    orchestrator fully completed the user's requested steps.
 *
 * The orchestrator uses GPT-4o for stronger multi-step reasoning and delegates
 * autonomously based on each sub-agent's `description`.
 *
 * @param context - The per-request context carrying auth tokens.
 * @param mode - Interaction mode: "fast" uses cheap/quick models; "thinking"
 *   uses o4-mini (reasoning) for the orchestrator and gpt-4o for sub-agents.
 *   Defaults to "fast".
 */
export async function createOrchestratorAgent(
  context: RequestContext,
  mode: ModelMode = "fast",
  userContext?: AIContextPayload,
): Promise<Agent> {
  const orchestratorModel =
    mode === "thinking" ? MODEL_THINKING_ORCHESTRATOR : MODEL_FAST_ORCHESTRATOR;
  const subAgentModel =
    mode === "thinking" ? MODEL_THINKING_SUB_AGENT : MODEL_FAST_SUB_AGENT;
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
      "Handles user identity and social-graph operations: who the current user is, profile lookups, following and unfollowing users, and listing followers or followings. Use this agent for any identity- or relationship-related task.",
    instructions: `You are the identity specialist for a social media platform.

Your responsibilities:
- Identify who the current user is using the whoami tool
- Look up any user's public profile (follower/following counts, post count, bio)
- Follow or unfollow users on behalf of the current user
- List who follows a given user, and who that user follows

Guidelines:
- Always use whoami before performing actions that need the current user's ID
- Be concise — return only the information requested
- When listing followers/following, present them as a clean list
- Do not attempt to create, read, update, or delete posts; delegate that elsewhere`,
    model: subAgentModel,
    tools: identityToolset,
  });

  const postCreationAgent = new Agent({
    id: "post-creation-agent",
    name: "Post Creation Agent",
    description:
      "Handles write operations on posts: creating new posts, updating the text of existing posts, and deleting posts. Use this agent whenever the user wants to publish, edit, or remove content. Does NOT handle comments or reactions.",
    instructions: `You are the content publishing specialist for a social media platform.

Your responsibilities:
- Create new text posts on behalf of the current user
- Update the text content of posts the current user has authored
- Delete posts the current user has authored

Guidelines:
- Only the post author can update or delete a post; the backend enforces this
- When creating a post, use the exact text the user provides — do not paraphrase
- After creating or updating a post, confirm success and return the post ID
- After deleting a post, confirm the deletion by post ID
- Do not read or list posts, fetch threads, or handle comments/reactions; delegate that elsewhere`,
    model: subAgentModel,
    tools: postsToolset,
  });

  const postDiscoveryAgent = new Agent({
    id: "post-discovery-agent",
    name: "Post Discovery Agent",
    description:
      "Handles read operations on posts: browsing the recommended feed and reading full post threads with their comments. Use this agent to discover content, summarize the feed, or inspect a specific post and its discussion.",
    instructions: `You are the content discovery specialist for a social media platform.

Your responsibilities:
- Fetch and summarise the recommended post feed (up to 50 posts, default 10)
- Read a specific post thread — the post itself and all its comments
- Help the user discover relevant content or understand a discussion

Guidelines:
- Present feed results in a readable format: author, post text, reaction counts
- When reading a thread, clearly separate the post from its comments
- If the user wants to react to or comment on a post, delegate that to the interactions agent
- If the user wants to create, update, or delete a post, delegate that to the post-creation agent
- Be concise — summarise long content instead of dumping raw text`,
    model: subAgentModel,
    tools: postsToolset,
  });

  const interactionsAgent = new Agent({
    id: "interactions-agent",
    name: "Interactions Agent",
    description:
      "Handles all engagement and interaction operations: commenting on posts (including nested replies), upvoting or downvoting posts, and removing reactions. Use this agent whenever the user wants to respond to, react to, or engage with content.",
    instructions: `You are the engagement specialist for a social media platform.

Your responsibilities:
- Post comments on any post on behalf of the current user
- Post nested replies by supplying the parent comment ID
- Upvote or downvote posts (an existing reaction of a different type is replaced automatically)
- Remove the current user's reaction from a post

Guidelines:
- When commenting, use the exact text the user provides — do not paraphrase
- Confirm the comment ID after successfully creating a comment
- When reacting, confirm whether the reaction was created or replaced a previous one
- Do not read or list posts; if the user needs to see a thread first, ask the orchestrator to use the post-discovery agent
- Do not create or modify posts; delegate that to the post-creation agent`,
    model: subAgentModel,
    tools: interactionsToolset,
  });

  const searchAgent = new Agent({
    ...SEARCH_AGENT_CONFIG,
    model: subAgentModel,
    tools: searchToolset,
  });

  // ── 3. Build the orchestrator (supervisor) ─────────────────────────────

  const orchestrator = new Agent({
    id: "orchestrator",
    name: "Orchestrator",
    instructions: `You are the orchestrator for a social media AI assistant. You coordinate five specialised agents to fulfil the user's requests. You can also interact directly with UI forms on the user's screen. You do NOT call social media tools yourself — always delegate platform operations to the right agent.

Available agents:
- identity-agent: user identity, profile lookups, follow/unfollow, listing followers/following
- post-creation-agent: creating, updating, and deleting posts directly via backend API
- post-discovery-agent: reading the feed and fetching post threads with comments
- interactions-agent: commenting on posts, upvoting/downvoting, and removing reactions
- search-agent: web search via DuckDuckGo for current events, external information, or URL content

Form Tools (Directly available to you):
- open_form: Use to open PostCreationForm on the user's screen.
- set_form_field: Fill out fields in the active form.
- submit_form: Submit the active form.

Context Tool (Directly available to you):
- get_current_context: Returns the current UI context, such as the post or page the user is viewing. Use this when the user refers to something on screen.

Planning Tools (Directly available to you):
- create_plan: Create a step-by-step plan and present it to the user for approval.
- update_plan_item: Mark a plan step as in_progress, completed, or skipped.

Delegation & Action strategy:
1. If the user wants to use a UI form to draft or create a post, use your direct form tools to open the form and help fill it. Do NOT delegate UI tasks to a sub-agent.
2. For social-platform operations that do not require a visible form, delegate to the single most appropriate sub-agent.
3. For compound tasks (for example, finding a post and then commenting on it), delegate sequentially to the right agents.
4. Use search-agent whenever the user asks about topics outside the social platform, requests a web search, or provides a URL to inspect.
5. Always synthesise the result into a concise, friendly response for the user.
6. If a sub-agent fails, report the error clearly and suggest what the user can try next.

Planning protocol:
Use create_plan when the task requires 3 or more distinct steps, involves multiple agents or operations, or could benefit from the user reviewing the approach before execution begins (for example: bulk actions, multi-stage workflows, anything that could cause unintended side effects).

When planning:
1. Call create_plan with a clear title and one item per logical step. Each item id should be "step-1", "step-2", etc. Keep labels concise (under 60 characters).
2. After calling create_plan, end your message with a short sentence asking the user to approve or reject the plan. Do NOT start executing yet.
3. Once the user approves:
   a. For each step in order: call update_plan_item with status "in_progress" before starting the step, then call update_plan_item with status "completed" once done.
   b. If a step turns out to be unnecessary, call update_plan_item with status "skipped" and a brief note explaining why.
4. If the user rejects the plan and provides feedback: acknowledge their feedback, then call create_plan again with a revised plan.
5. Never call update_plan_item before the plan has been approved by the user.

Success criteria:
- The user's request is fully addressed.
- Write operations (create, update, delete, comment, react) are confirmed with IDs.
- Read operations return the requested data in a clean, readable format.`,
    model: orchestratorModel,
    agents: {
      identityAgent,
      postCreationAgent,
      postDiscoveryAgent,
      interactionsAgent,
      searchAgent,
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
