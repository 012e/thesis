import { registerApiRoute } from '@mastra/core/server';
import { handleChatStream } from '@mastra/ai-sdk';
import { z } from 'zod';
import { createSocialMcpClient } from '../mcp/social';

/**
 * Chat stream route for AI agent responses with authenticated MCP clients.
 *
 * This route creates a curried MCP client per request with the auth token
 * baked into the client's fetch function, eliminating the need for RequestContext.
 *
 * Compatible with Vercel AI SDK's AssistantChatTransport.
 *
 * Usage:
 * POST /chat/:agentId
 * Headers:
 *   Authorization: Bearer <token>
 * Body:
 *   {
 *     "messages": [{ "id": "1", "role": "user", "parts": [{ "type": "text", "text": "Hello" }] }],
 *     "trigger": "submit-message"
 *   }
 *
 * Response: AI SDK-compatible UIMessage stream
 */

// UIMessage format from Vercel AI SDK
// Use permissive schema since parts can be text, file, tool-call, tool-result, etc.
const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(z.any()), // Accept any part type
  metadata: z.any().optional(),
});

const StreamRequestSchema = z.object({
  messages: z.array(UIMessageSchema).min(1, 'At least one message is required'),
  trigger: z.enum(['submit-message', 'regenerate-message']).optional(),
  messageId: z.string().optional(),
  metadata: z.any().optional(),
  resumeData: z.record(z.string(), z.any()).optional(),
  // Optional AI SDK fields
  callSettings: z.any().optional(),
  system: z.any().optional(),
  config: z.any().optional(),
  tools: z.any().optional(),
});

export const streamRoute = registerApiRoute('/chat/:agentId', {
  method: 'POST',
  handler: async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'Authorization header is required' }, 401);
      }

      // Extract agentId from path params
      const agentId = c.req.param('agentId');
      if (!agentId) {
        return c.json({ error: 'agentId is required in path' }, 400);
      }

      // Parse and validate request body
      const body = await c.req.json();
      const parseResult = StreamRequestSchema.safeParse(body);

      if (!parseResult.success) {
        return c.json(
          {
            error: 'Invalid request body',
            details: parseResult.error.issues,
          },
          400,
        );
      }

      const { messages, trigger, metadata, resumeData } = parseResult.data;

      // Create a curried MCP client with the auth header baked in
      const mcpClient = createSocialMcpClient(authHeader);

      // Get toolsets from the curried MCP client
      const toolsets = await mcpClient.listToolsets();

      // Use Mastra's handleChatStream for AI SDK-compatible streaming
      // Note: mastra is imported dynamically to avoid circular dependency
      const { mastra } = await import('../index.js');
      const stream = await handleChatStream({
        mastra,
        agentId,
        params: {
          messages,
          trigger,
          resumeData,
        } as any,
        defaultOptions: {
          toolsets,
        } as any,
      });

      // Return AI SDK-compatible stream response
      // Convert object stream to SSE format, then encode to bytes
      const sseStream = stream
        .pipeThrough(new (await import('ai')).JsonToSseTransformStream())
        .pipeThrough(new TextEncoderStream());

      return new Response(sseStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Vercel-AI-Data-Stream': 'v1',
          'x-accel-buffering': 'no',
        },
      });
    } catch (error) {
      console.error('Stream route error:', error);
      return c.json(
        {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
});
