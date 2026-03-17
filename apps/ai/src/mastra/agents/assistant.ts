import { Agent } from "@mastra/core/agent";

export const assistantAgent = new Agent({
  id: "assistant",
  name: "Assistant",
  instructions:
    "You are a helpful AI assistant. Answer questions clearly and concisely.",
  model: "openai/gpt-4o-mini",
});
