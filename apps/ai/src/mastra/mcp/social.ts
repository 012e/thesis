import { MCPClient } from "@mastra/mcp";
import { env } from "../../env";
import { RequestContext } from "@mastra/core/request-context";

function createAuthFetch(context: RequestContext) {
  return async (url: URL | RequestInfo, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const authHeader = context?.get("authorization") as string | undefined;
    if (authHeader) {
      headers.set("Authorization", `Bearer ${authHeader}`);
    }
    return fetch(url, { ...init, headers });
  };
}

function createMcpClient(context: RequestContext) {
  const fetchWithAuth = createAuthFetch(context);
  return new MCPClient({
    id: "social-mcp-client",
    servers: {
      identity: {
        url: new URL(`${env.BACKEND_URL}/mcp/identity/sse`),
        fetch: fetchWithAuth,
      },
      posts: {
        url: new URL(`${env.BACKEND_URL}/mcp/posts/sse`),
        fetch: fetchWithAuth,
      },
      interactions: {
        url: new URL(`${env.BACKEND_URL}/mcp/interactions/sse`),
        fetch: fetchWithAuth,
      },
      postManagement: {
        url: new URL(`${env.BACKEND_URL}/mcp/post-management/sse`),
        fetch: fetchWithAuth,
      },
      tags: {
        url: new URL(`${env.BACKEND_URL}/mcp/tags/sse`),
        fetch: fetchWithAuth,
      },
      agentSkills: {
        url: new URL(`${env.BACKEND_URL}/mcp/agent-skills/sse`),
        fetch: fetchWithAuth,
      },
    },
  });
}

export async function getSocialMcpToolsets(context: RequestContext) {
  const client = createMcpClient(context);
  const toolsets = await client.listToolsets();
  return {
    identityToolset: toolsets.identity,
    postsToolset: toolsets.posts,
    interactionsToolset: toolsets.interactions,
    postManagementToolset: toolsets.postManagement,
    tagsToolset: toolsets.tags,
    agentSkillsToolset: toolsets.agentSkills,
  };
}
