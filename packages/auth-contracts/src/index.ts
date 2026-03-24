import { initContract } from "@ts-rest/core";
import type { AppRouter } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const User = z.object({ id: z.string(), username: z.string() });
const PollPostOption = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});
const PollPostContent = z.object({
  question: z.string().min(1),
  options: z.array(PollPostOption).min(2),
  allowsMultipleSelections: z.boolean(),
  closesAt: z.iso.datetime().nullable().optional(),
});
const VisualizationDataPoint = z.object({
  label: z.string().min(1),
  value: z.number(),
});
const VisualizationPostContent = z.object({
  title: z.string().min(1),
  visualizationType: z.enum(["bar", "line", "pie", "table"]),
  data: z.array(VisualizationDataPoint).min(1),
  description: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
});
const PostContent = z
  .object({
    text: z.string().min(1).optional(),
    poll: PollPostContent.optional(),
    visualization: VisualizationPostContent.optional(),
  })
  .refine(
    (content) =>
      content.text !== undefined ||
      content.poll !== undefined ||
      content.visualization !== undefined,
    {
      message:
        "Post content must include at least one of text, poll, or visualization",
    },
  );
const PostAuthor = z.object({
  id: z.string(),
  username: z.string().nullable(),
  email: z.string(),
  name: z.string().nullable(),
});

const ReactionType = z.enum(["upvote", "downvote"]);

const Post = z.object({
  id: z.uuid(),
  authorId: z.string(),
  author: PostAuthor,
  content: PostContent,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  upvoteCount: z.number().int().nonnegative(),
  downvoteCount: z.number().int().nonnegative(),
  currentUserReaction: ReactionType.nullable(),
});

const CreatePostBody = z.object({
  content: PostContent,
});

const UpdatePostBody = z.object({
  content: PostContent,
});

const PostReaction = z.object({
  postId: z.uuid(),
  userId: z.string(),
  type: ReactionType,
  createdAt: z.iso.datetime(),
});

const PostReactionSummary = z.object({
  upvotes: z.number().int().nonnegative(),
  downvotes: z.number().int().nonnegative(),
  userReaction: ReactionType.nullable(),
});

const Reactor = z.object({
  id: z.string(),
  username: z.string().nullable(),
  email: z.string(),
  name: z.string().nullable(),
  reactionType: ReactionType,
  reactedAt: z.iso.datetime(),
});

const ReactPostBody = z.object({
  type: ReactionType,
});

const RecommendationPage = z.object({
  items: z.array(Post),
  nextCursor: z.string().nullable(),
});

const Thread = z.object({
  id: z.uuid(),
  externalId: z.string().optional().nullable(),
  title: z.string().nullable(),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const CreateThreadBody = z.object({
  localId: z.string().optional(),
});

const UpdateThreadTitleBody = z.object({
  title: z.string(),
});

const GenerateThreadTitleBody = z.object({
  messages: z.array(z.unknown()),
});

export const authContract = c.router({
  login: {
    method: "POST",
    path: "/auth/login",
    body: z.object({ username: z.string(), password: z.string() }),
    responses: {
      200: z.object({ token: z.string() }),
      401: z.null(),
    },
    summary: "Login with username/password",
  },
  me: {
    method: "GET",
    path: "/auth/me",
    responses: {
      200: User,
      401: z.null(),
    },
    summary: "Get current user",
  },
  listPosts: {
    method: "GET",
    path: "/posts",
    responses: {
      200: z.array(Post),
    },
    summary: "List social media posts",
  },
  createPost: {
    method: "POST",
    path: "/posts",
    body: CreatePostBody,
    responses: {
      201: Post,
    },
    summary: "Create a social media post",
  },
  getPost: {
    method: "GET",
    path: "/posts/:id",
    pathParams: z.object({ id: z.uuid() }),
    responses: {
      200: Post,
      404: z.null(),
    },
    summary: "Get a social media post",
  },
  updatePost: {
    method: "PUT",
    path: "/posts/:id",
    pathParams: z.object({ id: z.uuid() }),
    body: UpdatePostBody,
    responses: {
      200: Post,
      403: z.null(),
      404: z.null(),
    },
    summary: "Update a social media post",
  },
  deletePost: {
    method: "DELETE",
    path: "/posts/:id",
    pathParams: z.object({ id: z.uuid() }),
    responses: {
      200: Post,
      403: z.null(),
      404: z.null(),
    },
    summary: "Delete a social media post",
  },
  reactToPost: {
    method: "PUT",
    path: "/posts/:id/reaction",
    pathParams: z.object({ id: z.uuid() }),
    body: ReactPostBody,
    responses: {
      200: PostReaction,
      404: z.null(),
    },
    summary: "Upvote or downvote a post (replaces any existing reaction)",
  },
  unreactToPost: {
    method: "DELETE",
    path: "/posts/:id/reaction",
    pathParams: z.object({ id: z.uuid() }),
    body: z.undefined(),
    responses: {
      200: PostReaction,
      404: z.null(),
    },
    summary: "Remove the current user's reaction from a post",
  },
  getReactionSummary: {
    method: "GET",
    path: "/posts/:id/reaction",
    pathParams: z.object({ id: z.uuid() }),
    responses: {
      200: PostReactionSummary,
      404: z.null(),
    },
    summary: "Get upvote/downvote counts and the current user's reaction",
  },
  listReactors: {
    method: "GET",
    path: "/posts/:id/reactors",
    pathParams: z.object({ id: z.uuid() }),
    query: z.object({
      type: ReactionType.optional(),
    }),
    responses: {
      200: z.array(Reactor),
      404: z.null(),
    },
    summary: "List users who reacted to a post, optionally filtered by type",
  },
  getRecommendations: {
    method: "GET",
    path: "/recommendations",
    query: z.object({
      limit: z.coerce.number().int().positive().max(100).optional(),
      cursor: z.string().optional(),
    }),
    responses: {
      200: RecommendationPage,
    },
    summary:
      "Get recommended posts for the current user, ordered by total reaction count descending. Paginated with a keyset cursor encoding (reactionCount, postId).",
  },
  listThreads: {
    method: "GET",
    path: "/threads",
    responses: {
      200: z.array(Thread),
    },
    summary: "List all threads for the current user",
  },
  createThread: {
    method: "POST",
    path: "/threads",
    body: CreateThreadBody,
    responses: {
      201: Thread,
    },
    summary: "Create a new thread",
  },
  getThread: {
    method: "GET",
    path: "/threads/:id",
    pathParams: z.object({ id: z.uuid() }),
    responses: {
      200: Thread,
      404: z.null(),
    },
    summary: "Get a thread by ID",
  },
  updateThreadTitle: {
    method: "PATCH",
    path: "/threads/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: UpdateThreadTitleBody,
    responses: {
      200: z.object({ success: z.boolean() }),
    },
    summary: "Update thread title",
  },
  archiveThread: {
    method: "POST",
    path: "/threads/:id/archive",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.undefined(),
    responses: {
      200: z.object({ success: z.boolean() }),
    },
    summary: "Archive a thread",
  },
  unarchiveThread: {
    method: "POST",
    path: "/threads/:id/unarchive",
    pathParams: z.object({ id: z.uuid() }),
    body: z.undefined(),
    responses: {
      200: z.object({ success: z.boolean() }),
    },
    summary: "Unarchive a thread",
  },
  deleteThread: {
    method: "DELETE",
    path: "/threads/:id",
    pathParams: z.object({ id: z.uuid() }),
    body: z.undefined(),
    responses: {
      200: z.object({ success: z.boolean() }),
    },
    summary: "Delete a thread",
  },
  generateThreadTitle: {
    method: "POST",
    path: "/threads/:id/title",
    pathParams: z.object({ id: z.uuid() }),
    body: GenerateThreadTitleBody,
    responses: {
      200: z.object({ title: z.string() }),
    },
    summary: "Generate a title for a thread based on messages",
  },
}) satisfies AppRouter;

export type AuthContract = typeof authContract;

export default authContract;
