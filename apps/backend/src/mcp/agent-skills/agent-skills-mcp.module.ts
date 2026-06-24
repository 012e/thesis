import { Module } from "@nestjs/common";
import { McpModule, McpTransportType } from "@rekog/mcp-nest";
import { AuthGuard } from "@thallesp/nestjs-better-auth";

import { AgentSkillsModule } from "@/agent-skills/agent-skills.module";

import { AgentSkillTools } from "./agent-skill.tools";

@Module({
  imports: [
    McpModule.forRoot({
      name: "agent-skills-agent",
      version: "1.0.0",
      transport: [McpTransportType.SSE],
      sseEndpoint: "mcp/agent-skills/sse",
      messagesEndpoint: "mcp/agent-skills/messages",
      guards: [AuthGuard],
      allowUnauthenticatedAccess: false,
    }),
    AgentSkillsModule,
  ],
  providers: [AgentSkillTools],
})
export class AgentSkillsMcpModule {}
