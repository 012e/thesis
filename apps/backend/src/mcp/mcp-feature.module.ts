import { Module } from '@nestjs/common';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { SocialTools } from './social.tools';
import { PostTools } from './post.tools';
import { PostsModule } from '../posts/posts.module';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'social-agent',
      version: '1.0.0',
      transport: [McpTransportType.SSE],
      sseEndpoint: 'mcp/sse',
      messagesEndpoint: 'mcp/messages',
      guards: [AuthGuard],
      allowUnauthenticatedAccess: false,
    }),
    PostsModule,
    CommentsModule,
  ],
  providers: [SocialTools, PostTools],
})
export class McpFeatureModule {}
