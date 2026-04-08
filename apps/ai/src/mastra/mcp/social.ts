import { MCPClient } from '@mastra/mcp';
import { env } from '../../env';

/**
 * Creates a curried MCP client with authentication header baked in.
 * Each request gets its own client instance with the auth token embedded.
 *
 * @param authHeader - The Authorization header value (e.g., "Bearer token")
 * @returns A new MCPClient instance configured with the auth header
 */
export function createSocialMcpClient(authHeader: string): MCPClient {
  return new MCPClient({
    id: 'social-mcp-client',
    servers: {
      social: {
        url: new URL(`${env.BACKEND_URL}/mcp/sse`),
        fetch: async (url, init) => {
          const headers = new Headers(init?.headers);

          // Curry the auth header into the fetch function
          headers.set('Authorization', authHeader);

          return fetch(url, { ...init, headers });
        },
      },
    },
  });
}
