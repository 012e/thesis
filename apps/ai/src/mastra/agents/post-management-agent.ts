import { Agent } from "@mastra/core/agent";

import { PROMPTS } from "../../prompts";
import { MODEL_CONFIG } from "../constants";

export const POST_MANAGEMENT_AGENT_CONFIG = {
  id: "post-management-agent",
  name: "Post Management Agent",
  description:
    "Handles Q&A lifecycle, bookmarks, and post subscriptions: unanswered questions, accepting or clearing answers, saving or unsaving posts, listing the current user's bookmarks, and subscribing or unsubscribing from post updates. It does not create posts, discover general feeds, comment, or react.",
  instructions: PROMPTS.postManagementAgent,
} as const;

export const postManagementAgent = new Agent({
  ...POST_MANAGEMENT_AGENT_CONFIG,
  model: MODEL_CONFIG.POST_MANAGEMENT_AGENT.model,
});
