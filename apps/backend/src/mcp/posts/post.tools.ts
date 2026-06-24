import { Injectable } from "@nestjs/common";
import { Tool, type Context } from "@rekog/mcp-nest";
import { z } from "zod";
import { PostsService } from "../../posts/posts.service";
import { PostsSearchService } from "../../posts/posts-search.service";
import { CommentsService } from "../../comments/comments.service";

const postKindSchema = z.enum(["discussion", "question"]);

@Injectable()
export class PostTools {
  constructor(
    private readonly postsService: PostsService,
    private readonly postsSearchService: PostsSearchService,
    private readonly commentsService: CommentsService,
  ) {}

  @Tool({
    name: "get_recent_posts",
    description: "Get the most recent posts from the platform",
    parameters: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe("Number of posts to fetch"),
    }),
  })
  async getRecentPosts(
    { limit }: { limit: number },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const fetchedPosts = await this.postsService.recommendations(
      user.id,
      limit,
    );

    return {
      content: [
        { type: "text", text: JSON.stringify(fetchedPosts.items, null, 2) },
      ],
    };
  }

  @Tool({
    name: "get_post_thread",
    description: "Get a specific post along with all its comments",
    parameters: z.object({
      postId: z.string().uuid().describe("The UUID of the post"),
    }),
  })
  async getPostThread(
    { postId }: { postId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    const post = await this.postsService.getById(postId, user?.id);

    if (!post) {
      return {
        content: [
          { type: "text", text: `Error: Post with ID ${postId} not found.` },
        ],
      };
    }

    const postComments = await this.commentsService.list(postId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ post, comments: postComments }, null, 2),
        },
      ],
    };
  }

  @Tool({
    name: "create_post",
    description:
      "Create a new discussion or question post on the platform. Use question for help-seeking posts that can later accept an answer.",
    parameters: z.object({
      text: z.string().min(1).describe("Text content of the post"),
      kind: postKindSchema
        .default("discussion")
        .describe(
          "Post type: discussion for regular posts, question for help-seeking posts",
        ),
    }),
  })
  async createPost(
    {
      text,
      kind,
    }: { text: string; kind: "discussion" | "question" },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const newPost = await this.postsService.create(user.id, {
      content: { text },
      kind,
    });

    return {
      content: [
        {
          type: "text",
          text: `Post created successfully!\n\n${JSON.stringify(newPost, null, 2)}`,
        },
      ],
    };
  }

  @Tool({
    name: "update_post",
    description: "Update an existing post that you authored",
    parameters: z.object({
      postId: z.string().uuid().describe("The UUID of the post to update"),
      text: z.string().min(1).describe("The new text content for the post"),
    }),
  })
  async updatePost(
    { postId, text }: { postId: string; text: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const updatedPost = await this.postsService.update(postId, user.id, {
      content: { text },
    });

    if (!updatedPost) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Post not found or you are not authorized to update it.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Post updated successfully!\n\n${JSON.stringify(updatedPost, null, 2)}`,
        },
      ],
    };
  }

  @Tool({
    name: "delete_post",
    description: "Delete a post that you authored",
    parameters: z.object({
      postId: z.string().uuid().describe("The UUID of the post to delete"),
    }),
  })
  async deletePost(
    { postId }: { postId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const deletedPost = await this.postsService.delete(postId, user.id);

    if (!deletedPost) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Post not found or you are not authorized to delete it.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Post deleted successfully!\n\n${JSON.stringify(deletedPost, null, 2)}`,
        },
      ],
    };
  }

  @Tool({
    name: "search_posts",
    description:
      "Search for posts using a text query. Uses hybrid BM25 + semantic search for best results.",
    parameters: z.object({
      query: z.string().min(1).describe("The search query"),
    }),
  })
  async searchPosts(
    { query }: { query: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const results = await this.postsSearchService.search(query, user.id);

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }

  @Tool({
    name: "get_posts_by_user",
    description: "Get all posts authored by a specific user",
    parameters: z.object({
      userId: z
        .string()
        .min(1)
        .describe("The ID of the user whose posts to retrieve"),
    }),
  })
  async getPostsByUser(
    { userId }: { userId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const posts = await this.postsService.listByUser(userId, user.id);

    return {
      content: [{ type: "text", text: JSON.stringify(posts, null, 2) }],
    };
  }
}
