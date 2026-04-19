import { Module } from "@nestjs/common";
import { McpModule, McpTransportType } from "@rekog/mcp-nest";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { IdentityTools } from "./identity.tools";
import { UsersModule } from "../../users/users.module";
import { FollowsModule } from "../../follows/follows.module";

@Module({
  imports: [
    McpModule.forRoot({
      name: "identity-agent",
      version: "1.0.0",
      transport: [McpTransportType.SSE],
      sseEndpoint: "mcp/identity/sse",
      messagesEndpoint: "mcp/identity/messages",
      guards: [AuthGuard],
      allowUnauthenticatedAccess: false,
    }),
    UsersModule,
    FollowsModule,
  ],
  providers: [IdentityTools],
})
export class IdentityMcpModule {}
