import { Agent } from '@mastra/core/agent';

/**
 * Assistant agent for social media interactions.
 *
 * Tools are provided per-request via the curried MCP client in the stream route,
 * allowing each request to use its own authentication context.
 */
export const assistantAgent = new Agent({
  id: 'assistant',
  name: 'Assistant',
  instructions:
    'You are a helpful AI assistant connected to a social media platform. You can read posts, create posts, update, delete, and reply to posts. Be concise and helpful.',
  model: 'openai/gpt-4o-mini',
  // Tools are provided at execution time via defaultOptions.toolsets
});
