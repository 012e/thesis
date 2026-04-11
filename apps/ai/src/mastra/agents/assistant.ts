import { Agent } from '@mastra/core/agent';
import { MODEL_SUB_AGENT } from '../constants';

/**
 * Assistant agent for social media interactions.
 *
 * Tools are provided per-request via the curried MCP client in the stream route,
 * allowing each request to use its own authentication context.
 *
 * Memory is backed by PostgreSQL so conversation context persists across
 * sessions. Pass `memory.resource` and `memory.thread` when calling
 * `stream()` or `generate()` to activate it.
 */
export const assistantAgent = new Agent({
  id: 'assistant',
  name: 'Assistant',
  instructions:
    'You are a helpful AI assistant connected to a social media platform. You can read posts, create posts, update, delete, and reply to posts. Be concise and helpful.',
  model: MODEL_SUB_AGENT,
});
