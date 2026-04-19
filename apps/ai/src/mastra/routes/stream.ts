import { registerApiRoute } from "@mastra/core/server";
import { toAISdkStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { createOrchestratorAgent } from "../agents/orchestrator-agent";

/**
 * Chat stream route for the assistant agent with authenticated MCP clients.
 *
 * Creates a per-request MCP client with the auth token baked in, then
 * streams the agent response in AI SDK UIMessage format.
 *
 * Compatible with Vercel AI SDK's AssistantChatTransport.
 *
 * Usage:
 * POST /chat
 * Headers:
 *   Authorization: Bearer <token>
 * Body:
 *   {
 *     "messages": [{ "id": "1", "role": "user", "parts": [{ "type": "text", "text": "Hello" }] }],
 *   }
 *
 * Response: AI SDK-compatible UIMessage stream
 *
 * The orchestrator is created fresh per-request so each request's MCP tools
 * carry the correct auth token. Sub-agents receive their domain-specific tools
 * at construction time inside `createOrchestratorAgent`.
 */

// UIMessage format from Vercel AI SDK
// Use permissive schema since parts can be text, file, tool-call, tool-result, etc.
const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.any()), // Accept any part type
  metadata: z.any().optional(),
});

const StreamRequestSchema = z.object({
  messages: z.array(UIMessageSchema).min(1, "At least one message is required"),
  trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  messageId: z.string().optional(),
  metadata: z.any().optional(),
  resumeData: z.record(z.string(), z.any()).optional(),
});

export const streamRoute = registerApiRoute("/chat", {
  method: "POST",
  handler: async (c) => {
    try {
      const body = await c.req.json();
      const parseResult = StreamRequestSchema.safeParse(body);

      if (!parseResult.success) {
        return c.json(
          {
            error: "Invalid request body",
            details: parseResult.error.issues,
          },
          400,
        );
      }

      const { messages } = parseResult.data;
      const context = c.get("requestContext");

      // Build a per-request orchestrator with auth-aware MCP tools baked into
      // each sub-agent at construction time.
      const orchestrator = await createOrchestratorAgent(context);

      const agentStream = await orchestrator.stream(messages, {
        maxSteps: 20,
      });

      return createUIMessageStreamResponse({
        // Cast resolves Node.js vs Web Streams API ambient type mismatch; runtime is correct
        stream: toAISdkStream(agentStream, { from: "agent" }) as any,
      });
    } catch (error) {
      console.error("Stream route error:", error);
      return c.json(
        {
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
});
