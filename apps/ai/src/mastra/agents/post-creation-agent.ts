import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";

/**
 * Post-creation agent — owns all write operations on posts.
 *
 * Capable of:
 * - Creating new text posts authored by the current user
 * - Updating the text of an existing post (author-only)
 * - Deleting an existing post (author-only)
 *
 * Tools are injected per-request by the orchestrator via toolsets so that each
 * HTTP request carries its own authentication context.
 */
export const postCreationAgent = new Agent({
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
});
