import { Injectable } from '@nestjs/common';
import { Tool, type Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { CommentsService } from '../comments/comments.service';

@Injectable()
export class SocialTools {
  constructor(private readonly commentsService: CommentsService) {}

  @Tool({
    name: 'whoami',
    description:
      'Get information about the currently authenticated user (agent)',
  })
  async whoami(_args: any, _context: Context, request: any) {
    const user = request.user;
    if (!user)
      return { content: [{ type: 'text', text: 'Error: Not authenticated' }] };

    return {
      content: [
        {
          type: 'text',
          text: `You are logged in as ${user.name || user.username || 'Unknown'} (${user.email}). ID: ${user.id}`,
        },
      ],
    };
  }

  @Tool({
    name: 'create_comment',
    description: 'Reply to an existing post or comment',
    parameters: z.object({
      postId: z.string().uuid().describe('The UUID of the post to comment on'),
      content: z.string().min(1).describe('The comment text'),
      parentId: z
        .string()
        .uuid()
        .optional()
        .describe(
          'Optional: UUID of the parent comment if replying to a comment',
        ),
    }),
  })
  async createComment(
    {
      postId,
      content,
      parentId,
    }: { postId: string; content: string; parentId?: string },
    context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: 'text', text: 'Error: Not authenticated' }] };

    const newComment = await this.commentsService.create(
      user.id,
      postId,
      content,
      parentId,
    );

    return {
      content: [
        {
          type: 'text',
          text: `Comment created successfully!\n\n${JSON.stringify(newComment, null, 2)}`,
        },
      ],
    };
  }
}
