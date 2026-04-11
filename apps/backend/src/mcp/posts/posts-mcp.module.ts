import { Module } from '@nestjs/common';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PostTools } from './post.tools';
import { PostsModule } from '../../posts/posts.module';
import { CommentsModule } from '../../comments/comments.module';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'posts-agent',
      version: '1.0.0',
      transport: [McpTransportType.SSE],
      sseEndpoint: 'mcp/posts/sse',
      messagesEndpoint: 'mcp/posts/messages',
      guards: [AuthGuard],
      allowUnauthenticatedAccess: false,
    }),
    PostsModule,
    CommentsModule,
  ],
  providers: [PostTools],
})
export class PostsMcpModule {}
