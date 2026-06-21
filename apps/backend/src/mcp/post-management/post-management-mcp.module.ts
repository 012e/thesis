import { Module } from "@nestjs/common";
import { McpModule, McpTransportType } from "@rekog/mcp-nest";
import { AuthGuard } from "@thallesp/nestjs-better-auth";

import { PostsModule } from "@/posts/posts.module";

import { PostManagementTools } from "./post-management.tools";

@Module({
  imports: [
    McpModule.forRoot({
      name: "post-management-agent",
      version: "1.0.0",
      transport: [McpTransportType.SSE],
      sseEndpoint: "mcp/post-management/sse",
      messagesEndpoint: "mcp/post-management/messages",
      guards: [AuthGuard],
      allowUnauthenticatedAccess: false,
    }),
    PostsModule,
  ],
  providers: [PostManagementTools],
})
export class PostManagementMcpModule {}
