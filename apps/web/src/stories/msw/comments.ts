import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";
import type { CommentType } from "@repo/rest-contracts";

// --- Faker-generated UUIDs (evaluated once at module load) ---

export const STORY_UUIDS = {
  // Users
  USER_1: faker.string.uuid(),
  USER_2: faker.string.uuid(),
  USER_3: faker.string.uuid(),
  USER_4: faker.string.uuid(),
  USER_VIEWER: faker.string.uuid(),
  // Posts
  POST_1: faker.string.uuid(),
  POST_2: faker.string.uuid(),
  POST_3: faker.string.uuid(),
  POST_4: faker.string.uuid(),
  // Comments
  COMMENT_1: faker.string.uuid(),
  COMMENT_2: faker.string.uuid(),
  COMMENT_3: faker.string.uuid(),
  COMMENT_4: faker.string.uuid(),
  COMMENT_5: faker.string.uuid(),
};

// --- Helpers ---

export const makeAuthor = (id: string, name: string, username: string) => ({
  id,
  username,
  email: `${username}@example.com`,
  name,
  image: null,
});

export const VIEWER_AUTHOR = makeAuthor(
  STORY_UUIDS.USER_VIEWER,
  "Viewer",
  "viewer",
);

// --- Preset comment datasets ---

const now = new Date().toISOString();
const fiveMinAgo = new Date(Date.now() - 300_000).toISOString();
const tenMinAgo = new Date(Date.now() - 600_000).toISOString();
const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

export const flatComments = (postId: string): CommentType[] => [
  {
    id: STORY_UUIDS.COMMENT_1,
    postId,
    parentId: null,
    authorId: STORY_UUIDS.USER_1,
    author: makeAuthor(STORY_UUIDS.USER_1, "Alice Johnson", "alicej"),
    content: "This is a really insightful post. Thanks for sharing!",
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
    upvoteCount: 5,
    downvoteCount: 1,
    currentUserReaction: null,
  },
  {
    id: STORY_UUIDS.COMMENT_2,
    postId,
    parentId: null,
    authorId: STORY_UUIDS.USER_2,
    author: makeAuthor(STORY_UUIDS.USER_2, "Bob Smith", "bobsmith"),
    content:
      "I had a similar experience. The key takeaway for me was to always test edge cases.",
    createdAt: tenMinAgo,
    updatedAt: tenMinAgo,
    upvoteCount: 3,
    downvoteCount: 0,
    currentUserReaction: "upvote",
  },
  {
    id: STORY_UUIDS.COMMENT_3,
    postId,
    parentId: null,
    authorId: STORY_UUIDS.USER_3,
    author: makeAuthor(STORY_UUIDS.USER_3, "Carol White", "carolw"),
    content: "Bookmarked for later. Great discussion happening here.",
    createdAt: fiveMinAgo,
    updatedAt: fiveMinAgo,
    upvoteCount: 0,
    downvoteCount: 2,
    currentUserReaction: "downvote",
  },
];

export const nestedComments = (postId: string): CommentType[] => [
  {
    id: STORY_UUIDS.COMMENT_1,
    postId,
    parentId: null,
    authorId: STORY_UUIDS.USER_1,
    author: makeAuthor(STORY_UUIDS.USER_1, "Alice Johnson", "alicej"),
    content: "What do you all think about the new React compiler?",
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
    upvoteCount: 8,
    downvoteCount: 0,
    currentUserReaction: null,
  },
  {
    id: STORY_UUIDS.COMMENT_2,
    postId,
    parentId: STORY_UUIDS.COMMENT_1,
    authorId: STORY_UUIDS.USER_2,
    author: makeAuthor(STORY_UUIDS.USER_2, "Bob Smith", "bobsmith"),
    content:
      "I've been testing it on a production app. The performance gains are noticeable, especially on re-renders.",
    createdAt: tenMinAgo,
    updatedAt: tenMinAgo,
    upvoteCount: 4,
    downvoteCount: 1,
    currentUserReaction: "upvote",
  },
  {
    id: STORY_UUIDS.COMMENT_3,
    postId,
    parentId: STORY_UUIDS.COMMENT_2,
    authorId: STORY_UUIDS.USER_3,
    author: makeAuthor(STORY_UUIDS.USER_3, "Carol White", "carolw"),
    content:
      "That's great to hear! Did you have to make any code changes or was it a drop-in replacement?",
    createdAt: fiveMinAgo,
    updatedAt: fiveMinAgo,
    upvoteCount: 2,
    downvoteCount: 0,
    currentUserReaction: null,
  },
  {
    id: STORY_UUIDS.COMMENT_4,
    postId,
    parentId: STORY_UUIDS.COMMENT_2,
    authorId: STORY_UUIDS.USER_1,
    author: makeAuthor(STORY_UUIDS.USER_1, "Alice Johnson", "alicej"),
    content: "I'd love to see some benchmarks if you have them.",
    createdAt: now,
    updatedAt: now,
    upvoteCount: 1,
    downvoteCount: 0,
    currentUserReaction: null,
  },
  {
    id: STORY_UUIDS.COMMENT_5,
    postId,
    parentId: null,
    authorId: STORY_UUIDS.USER_4,
    author: makeAuthor(STORY_UUIDS.USER_4, "Dave Lee", "davelee"),
    content: "Off-topic but the new `use` hook is also a game changer.",
    createdAt: fiveMinAgo,
    updatedAt: fiveMinAgo,
    upvoteCount: 0,
    downvoteCount: 3,
    currentUserReaction: "downvote",
  },
];

export const singleComment = (postId: string): CommentType[] => [
  {
    id: STORY_UUIDS.COMMENT_1,
    postId,
    parentId: null,
    authorId: STORY_UUIDS.USER_1,
    author: makeAuthor(STORY_UUIDS.USER_1, "Alice Johnson", "alicej"),
    content: `First comment! Looking forward to the discussion.
Here is some code:
\`\`\`ts
function doSomething(a = "ok") {
  return doSomething("not ok");
  }
\`\`\`
`,
    createdAt: now,
    updatedAt: now,
    upvoteCount: 0,
    downvoteCount: 0,
    currentUserReaction: null,
  },
];

export const twoComments = (postId: string): CommentType[] => [
  {
    id: STORY_UUIDS.COMMENT_1,
    postId,
    parentId: null,
    authorId: STORY_UUIDS.USER_2,
    author: makeAuthor(STORY_UUIDS.USER_2, "Bob Smith", "bobsmith"),
    content: "Great feature! I've been waiting for this.",
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
    upvoteCount: 2,
    downvoteCount: 0,
    currentUserReaction: null,
  },
  {
    id: STORY_UUIDS.COMMENT_2,
    postId,
    parentId: STORY_UUIDS.COMMENT_1,
    authorId: STORY_UUIDS.USER_3,
    author: makeAuthor(STORY_UUIDS.USER_3, "Alice W", "alicew"),
    content: "Same here! Works perfectly on mobile too.",
    createdAt: now,
    updatedAt: now,
    upvoteCount: 1,
    downvoteCount: 0,
    currentUserReaction: null,
  },
];

// --- MSW handler factories ---

/**
 * Creates an MSW GET handler for `GET /posts/:postId/comments` that returns
 * the provided comments array regardless of the postId in the URL.
 */
export const makeCommentsHandler = (comments: CommentType[]) =>
  http.get("*/posts/:postId/comments", () => HttpResponse.json(comments));

/**
 * Creates an MSW POST handler for `POST /comments/:commentId/replies` that
 * echoes back a new reply authored by the viewer user.
 */
export const makeReplyHandler = (postId: string) =>
  http.post("*/comments/:commentId/replies", async ({ request }) => {
    const body = (await request.json()) as { content: string };
    return HttpResponse.json({
      id: crypto.randomUUID(),
      postId,
      parentId: STORY_UUIDS.COMMENT_1,
      authorId: STORY_UUIDS.USER_VIEWER,
      author: VIEWER_AUTHOR,
      content: body.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      upvoteCount: 0,
      downvoteCount: 0,
      currentUserReaction: null,
    });
  });

/** MSW DELETE handler for `DELETE /comments/:commentId` — returns 204. */
export const deleteCommentHandler = http.delete(
  "*/comments/:commentId",
  () => new HttpResponse(null, { status: 204 }),
);

/**
 * MSW PUT handler for `PUT /comments/:commentId/reaction`.
 * Returns a minimal 200 response so the mutation resolves successfully.
 * The UI uses optimistic updates, so the exact response body is not used.
 */
export const reactToCommentHandler = http.put(
  "*/comments/:commentId/reaction",
  async ({ params, request }) => {
    const body = (await request.json()) as { type: string };
    return HttpResponse.json({
      commentId: params["commentId"],
      userId: STORY_UUIDS.USER_VIEWER,
      type: body.type,
      createdAt: new Date().toISOString(),
    });
  },
);

/**
 * MSW DELETE handler for `DELETE /comments/:commentId/reaction`.
 * Returns a minimal 200 response so the mutation resolves successfully.
 */
export const unreactToCommentHandler = http.delete(
  "*/comments/:commentId/reaction",
  ({ params }) =>
    HttpResponse.json({
      commentId: params["commentId"],
      userId: STORY_UUIDS.USER_VIEWER,
      type: "upvote",
      createdAt: new Date().toISOString(),
    }),
);
