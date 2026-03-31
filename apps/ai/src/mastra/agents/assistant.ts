import { Agent } from "@mastra/core/agent";
import { socialMcpClient } from "../mcp/social";

export const assistantAgent = new Agent({
  id: "assistant",
  name: "Assistant",
  instructions:
    "You are a helpful AI assistant connected to a social media platform. You can read posts, create posts, update, delete, and reply to posts. Be concise and helpful.",
  model: "openai/gpt-4o-mini",
  tools: { ...(await socialMcpClient.listToolsets()) },
});
