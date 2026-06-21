import { Module } from "@nestjs/common";
import { McpModule, McpTransportType } from "@rekog/mcp-nest";
import { AuthGuard } from "@thallesp/nestjs-better-auth";

import { TagsModule } from "@/tags/tags.module";

import { TagTools } from "./tag.tools";

@Module({
  imports: [
    McpModule.forRoot({
      name: "tags-agent",
      version: "1.0.0",
      transport: [McpTransportType.SSE],
      sseEndpoint: "mcp/tags/sse",
      messagesEndpoint: "mcp/tags/messages",
      guards: [AuthGuard],
      allowUnauthenticatedAccess: false,
    }),
    TagsModule,
  ],
  providers: [TagTools],
})
export class TagsMcpModule {}
