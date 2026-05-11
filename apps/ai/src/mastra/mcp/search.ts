import { MCPClient } from "@mastra/mcp";

function createSearchMcpClient() {
  return new MCPClient({
    id: "search-mcp-client",
    servers: {
      duckduckgo: {
        command: "uvx",
        args: ["duckduckgo-mcp-server"],
      },
    },
  });
}

export async function getSearchMcpToolset() {
  const client = createSearchMcpClient();
  const toolsets = await client.listToolsets();
  return toolsets.duckduckgo;
}
