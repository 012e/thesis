import { MCPClient } from "@mastra/mcp";
import { env } from "../../env";

/**
 * Singleton MCP client for the social media backend.
 *
 * This client uses the requestContext pattern to support per-request authentication.
 * Pass a requestContext with 'Authorization' key to agent.stream() or agent.generate()
 * to authenticate requests to the backend MCP server.
 *
 * @example
 * ```typescript
 * const requestContext = new Map();
 * requestContext.set('Authorization', 'Bearer token');
 *
 * const stream = await agent.stream(message, {
 *   toolsets: await socialMcpClient.listToolsets(),
 *   requestContext,
 * });
 * ```
 */
export const socialMcpClient = new MCPClient({
  id: "social-mcp-client",
  servers: {
    social: {
      url: new URL(`${env.BACKEND_URL}/mcp/sse`),
      fetch: async (url, init, requestContext) => {
        const headers = new Headers(init?.headers);

        // Extract Authorization header from requestContext
        // This allows per-request authentication while reusing the same MCP connection
        const authHeader = requestContext?.get("Authorization");
        if (authHeader && typeof authHeader === "string") {
          headers.set("Authorization", authHeader);
        }

        return fetch(url, { ...init, headers });
      },
    },
  },
});
