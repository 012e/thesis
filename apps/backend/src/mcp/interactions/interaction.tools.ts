import { Injectable } from "@nestjs/common";
import { Tool, type Context } from "@rekog/mcp-nest";
import { z } from "zod";
import { CommentsService } from "../../comments/comments.service";
import { ReactionsService } from "../../reactions/reactions.service";
import { PollsService } from "../../polls/polls.service";

@Injectable()
export class InteractionTools {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly reactionsService: ReactionsService,
    private readonly pollsService: PollsService,
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

  @Tool({
    name: "delete_comment",
    description: "Delete a comment that you authored",
    parameters: z.object({
      commentId: z
        .string()
        .uuid()
        .describe("The UUID of the comment to delete"),
    }),
  })
  async deleteComment(
    { commentId }: { commentId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const existing = await this.commentsService.getById(commentId, user.id);
    if (!existing) {
      return {
        content: [
          { type: "text", text: `Error: Comment ${commentId} not found.` },
        ],
      };
    }

    if (existing.authorId !== user.id) {
      return {
        content: [
          {
            type: "text",
            text: `Error: You are not authorized to delete comment ${commentId}.`,
          },
        ],
      };
    }

    const deleted = await this.commentsService.delete(commentId);

    return {
      content: [
        {
          type: "text",
          text: `Comment deleted successfully!\n\n${JSON.stringify(deleted, null, 2)}`,
        },
      ],
    };
  }

  @Tool({
    name: "list_comment_replies",
    description: "List all replies to a specific comment",
    parameters: z.object({
      commentId: z
        .string()
        .uuid()
        .describe("The UUID of the parent comment"),
    }),
  })
  async listCommentReplies(
    { commentId }: { commentId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const replies = await this.commentsService.listReplies(commentId, user.id);

    return {
      content: [{ type: "text", text: JSON.stringify(replies, null, 2) }],
    };
  }

  @Tool({
    name: "react_to_comment",
    description: "Upvote or downvote a comment",
    parameters: z.object({
      commentId: z
        .string()
        .uuid()
        .describe("The UUID of the comment to react to"),
      type: z.enum(["upvote", "downvote"]).describe("The reaction type"),
    }),
  })
  async reactToComment(
    {
      commentId,
      type,
    }: { commentId: string; type: "upvote" | "downvote" },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.reactionsService.reactToComment(
      commentId,
      user.id,
      type,
    );
    if (!result) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Comment ${commentId} not found.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully reacted with "${type}" to comment ${commentId}.`,
        },
      ],
    };
  }

  @Tool({
    name: "unreact_to_comment",
    description: "Remove your reaction from a comment",
    parameters: z.object({
      commentId: z
        .string()
        .uuid()
        .describe("The UUID of the comment to remove the reaction from"),
    }),
  })
  async unreactToComment(
    { commentId }: { commentId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.reactionsService.unreactToComment(
      commentId,
      user.id,
    );
    if (!result) {
      return {
        content: [
          {
            type: "text",
            text: `No reaction found on comment ${commentId} to remove.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully removed reaction from comment ${commentId}.`,
        },
      ],
    };
  }

  @Tool({
    name: "vote_on_poll",
    description: "Vote on a poll attached to a post",
    parameters: z.object({
      postId: z
        .string()
        .uuid()
        .describe("The UUID of the post containing the poll"),
      optionIds: z
        .array(z.string())
        .min(1)
        .describe("The IDs of the poll options to vote for"),
    }),
  })
  async voteOnPoll(
    { postId, optionIds }: { postId: string; optionIds: string[] },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.pollsService.vote(postId, user.id, { optionIds });

    if ("error" in result) {
      return {
        content: [{ type: "text", text: `Error: ${result.error}` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Vote recorded successfully!\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  @Tool({
    name: "unvote_poll",
    description: "Remove your vote from a poll",
    parameters: z.object({
      postId: z
        .string()
        .uuid()
        .describe("The UUID of the post containing the poll"),
    }),
  })
  async unvotePoll(
    { postId }: { postId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.pollsService.unvote(postId, user.id);

    if ("error" in result) {
      return {
        content: [{ type: "text", text: `Error: ${result.error}` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Vote removed successfully!\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  @Tool({
    name: "get_poll_results",
    description: "Get the current results of a poll attached to a post",
    parameters: z.object({
      postId: z
        .string()
        .uuid()
        .describe("The UUID of the post containing the poll"),
    }),
  })
  async getPollResults(
    { postId }: { postId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.pollsService.getResults(postId, user.id);

    if ("error" in result) {
      return {
        content: [{ type: "text", text: `Error: ${result.error}` }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
}
