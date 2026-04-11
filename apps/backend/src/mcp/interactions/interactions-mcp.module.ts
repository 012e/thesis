import { Module } from '@nestjs/common';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { InteractionTools } from './interaction.tools';
import { CommentsModule } from '../../comments/comments.module';
import { ReactionsModule } from '../../reactions/reactions.module';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'interactions-agent',
      version: '1.0.0',
      transport: [McpTransportType.SSE],
      sseEndpoint: 'mcp/interactions/sse',
      messagesEndpoint: 'mcp/interactions/messages',
      guards: [AuthGuard],
      allowUnauthenticatedAccess: false,
    }),
    CommentsModule,
    ReactionsModule,
  ],
  providers: [InteractionTools],
})
export class InteractionsMcpModule {}
