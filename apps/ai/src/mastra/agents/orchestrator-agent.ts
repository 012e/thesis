import { Agent } from '@mastra/core/agent';
import { RequestContext } from '@mastra/core/request-context';
import { getSocialMcpToolsets } from '../mcp/social';
import { MODEL_ORCHESTRATOR, MODEL_SUB_AGENT } from '../constants';

/**
 * Creates a fully wired orchestrator agent for a single HTTP request.
 *
 * Because MCP toolsets carry per-request auth tokens, sub-agents cannot be
 * constructed once at module load time. Instead this factory:
 *
 * 1. Fetches all three MCP toolsets (identity, posts, interactions) using the
 *    current request's auth context.
 * 2. Constructs four specialised sub-agents, each receiving only the subset of
 *    tools that belongs to its domain.
 * 3. Returns an orchestrator (supervisor) agent that has all four sub-agents
 *    registered. Use `stepJudgeAgent` separately to evaluate whether the
 *    orchestrator fully completed the user's requested steps.
 *
 * The orchestrator uses GPT-4o for stronger multi-step reasoning and delegates
 * autonomously based on each sub-agent's `description`.
 */
export async function createOrchestratorAgent(
  context: RequestContext,
): Promise<Agent> {
  // ── 1. Fetch per-request MCP toolsets ──────────────────────────────────
  const { identityToolset, postsToolset, interactionsToolset } =
    await getSocialMcpToolsets(context);

  // ── 2. Build specialised sub-agents with their tools baked in ──────────

  const identityAgent = new Agent({
    id: 'identity-agent',
    name: 'Identity Agent',
    description:
      'Handles user identity and social-graph operations: who the current user is, profile lookups, following and unfollowing users, and listing followers or followings. Use this agent for any identity- or relationship-related task.',
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
    model: MODEL_SUB_AGENT,
    tools: identityToolset,
  });

  const postCreationAgent = new Agent({
    id: 'post-creation-agent',
    name: 'Post Creation Agent',
    description:
      'Handles write operations on posts: creating new posts, updating the text of existing posts, and deleting posts. Use this agent whenever the user wants to publish, edit, or remove content. Does NOT handle comments or reactions.',
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
    model: MODEL_SUB_AGENT,
    tools: postsToolset,
  });

  const postDiscoveryAgent = new Agent({
    id: 'post-discovery-agent',
    name: 'Post Discovery Agent',
    description:
      'Handles read operations on posts: browsing the recommended feed and reading full post threads with their comments. Use this agent to discover content, summarize the feed, or inspect a specific post and its discussion.',
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
    model: MODEL_SUB_AGENT,
    tools: postsToolset,
  });

  const interactionsAgent = new Agent({
    id: 'interactions-agent',
    name: 'Interactions Agent',
    description:
      'Handles all engagement and interaction operations: commenting on posts (including nested replies), upvoting or downvoting posts, and removing reactions. Use this agent whenever the user wants to respond to, react to, or engage with content.',
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
    model: MODEL_SUB_AGENT,
    tools: interactionsToolset,
  });

  // ── 3. Build the orchestrator (supervisor) ─────────────────────────────

  const orchestrator = new Agent({
    id: 'orchestrator',
    name: 'Orchestrator',
    instructions: `You are the orchestrator for a social media AI assistant. You coordinate four specialised agents to fulfil the user's requests. You do NOT call social media tools yourself — always delegate to the right agent.

Available agents:
- identity-agent: user identity, profile lookups, follow/unfollow, listing followers/following
- post-creation-agent: creating, updating, and deleting posts
- post-discovery-agent: reading the feed and fetching post threads with comments
- interactions-agent: commenting on posts, upvoting/downvoting, and removing reactions

Delegation strategy:
1. Identify what the user wants to do.
2. Route to the single most appropriate agent.
3. For compound tasks (e.g. "find a post and then comment on it"), delegate sequentially:
   first to post-discovery-agent, then to interactions-agent.
4. Always synthesise the sub-agent's result into a concise, friendly response for the user.
5. If a sub-agent fails, report the error clearly and suggest what the user can try next.

Success criteria:
- The user's request is fully addressed.
- Write operations (create, update, delete, comment, react) are confirmed with IDs.
- Read operations return the requested data in a clean, readable format.`,
    model: MODEL_ORCHESTRATOR,
    agents: {
      identityAgent,
      postCreationAgent,
      postDiscoveryAgent,
      interactionsAgent,
    },
  });

  return orchestrator;
}
