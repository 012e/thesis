import { Agent } from "@mastra/core/agent";

import { PROMPTS } from "../../prompts";
import { MODEL_CONFIG } from "../constants";

export const TAGS_AGENT_CONFIG = {
  id: "tags-agent",
  name: "Tags Agent",
  description:
    "Handles tag discovery and the current user's tag preferences: trending or suggested tags, tag details, posts filtered by a tag, and preferred or blocked tag management. It does not perform general post search or create and edit posts.",
  instructions: PROMPTS.tagsAgent,
} as const;

export const tagsAgent = new Agent({
  ...TAGS_AGENT_CONFIG,
  model: MODEL_CONFIG.TAGS_AGENT.model,
});
