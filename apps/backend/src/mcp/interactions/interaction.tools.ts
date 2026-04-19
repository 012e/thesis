import { Injectable } from "@nestjs/common";
import { Tool, type Context } from "@rekog/mcp-nest";
import { z } from "zod";
import { CommentsService } from "../../comments/comments.service";
import { ReactionsService } from "../../reactions/reactions.service";

@Injectable()
export class InteractionTools {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly reactionsService: ReactionsService,
  ) {}

  @Tool({
    name: "create_comment",
    description: "Reply to an existing post or comment",
    parameters: z.object({
      postId: z.string().uuid().describe("The UUID of the post to comment on"),
      content: z.string().min(1).describe("The comment text"),
      parentId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "Optional: UUID of the parent comment if replying to a comment",
        ),
    }),
  })
  async createComment(
    {
      postId,
      content,
      parentId,
    }: { postId: string; content: string; parentId?: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const newComment = await this.commentsService.create(
      user.id,
      postId,
      content,
      parentId,
    );

    return {
      content: [
        {
          type: "text",
          text: `Comment created successfully!\n\n${JSON.stringify(newComment, null, 2)}`,
        },
      ],
    };
  }

  @Tool({
    name: "react_to_post",
    description: "Upvote or downvote a post",
    parameters: z.object({
      postId: z.string().uuid().describe("The UUID of the post to react to"),
      type: z.enum(["upvote", "downvote"]).describe("The reaction type"),
    }),
  })
  async reactToPost(
    { postId, type }: { postId: string; type: "upvote" | "downvote" },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.reactionsService.react(postId, user.id, type);
    if (!result) {
      return {
        content: [{ type: "text", text: `Error: Post ${postId} not found.` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully reacted with "${type}" to post ${postId}.`,
        },
      ],
    };
  }

  @Tool({
    name: "unreact_to_post",
    description: "Remove your reaction from a post",
    parameters: z.object({
      postId: z
        .string()
        .uuid()
        .describe("The UUID of the post to remove the reaction from"),
    }),
  })
  async unreactToPost(
    { postId }: { postId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.reactionsService.unreact(postId, user.id);
    if (!result) {
      return {
        content: [
          {
            type: "text",
            text: `No reaction found on post ${postId} to remove.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully removed reaction from post ${postId}.`,
        },
      ],
    };
  }
}
