import { registerApiRoute } from "@mastra/core/server";
import { RequestContext } from "@mastra/core/request-context";
import { z } from "zod";
import { assistantAgent } from "../agents/assistant";
import { socialMcpClient } from "../mcp/social";

/**
 * Stream route for AI agent responses with authenticated MCP clients.
 *
 * This route uses the requestContext pattern to forward per-request authentication
 * to the MCP client without creating new connections. The singleton MCP client
 * reuses the SSE connection while supporting different auth tokens per request.
 *
 * Usage:
 * POST /stream
 * Headers:
 *   Authorization: Bearer <token>
 * Body:
 *   { "message": "Your message here" }
 *
 * Response: text/plain stream of AI-generated text chunks
 */

const StreamRequestSchema = z.object({
  message: z
    .string()
    .min(1, "Message is required and must be a non-empty string"),
});

export const streamRoute = registerApiRoute("/stream", {
  method: "POST",
  handler: async (c) => {
    try {
      const authHeader = c.req.header("Authorization");

      if (!authHeader) {
        return c.json({ error: "Authorization header is required" }, 401);
      }

      // Parse and validate request body
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

      const { message } = parseResult.data;

      // Create requestContext with auth data
      // This RequestContext gets forwarded to the MCP client's custom fetch function
      const requestContext = new RequestContext([
        ["Authorization", authHeader],
      ]);

      // Get toolsets from the singleton MCP client
      // The connection is reused, only authentication changes per request
      const toolsets = await socialMcpClient.listToolsets();

      // Stream the agent response with requestContext
      // The agent will forward requestContext to MCP tools during execution
      const stream = await assistantAgent.stream(message, {
        toolsets,
        requestContext,
      });

      // Create a ReadableStream from the text stream
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream.textStream) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
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
