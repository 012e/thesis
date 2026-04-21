import { http, HttpResponse } from "msw";
import type { CommentType } from "@repo/rest-contracts";

// --- Stable UUIDs for deterministic story data ---

export const STORY_UUIDS = {
  // Users (version 4, variant 8)
  USER_1: "11111111-1111-4111-8111-111111111111",
  USER_2: "22222222-2222-4222-8222-222222222222",
  USER_3: "33333333-3333-4333-8333-333333333333",
  USER_4: "44444444-4444-4444-8444-444444444444",
  USER_VIEWER: "00000000-0000-4000-8000-000000000001",
  // Posts (version 4, variant 8)
  POST_1: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  POST_2: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  POST_3: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  POST_4: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  // Comments (version 4, variant 8)
  COMMENT_1: "c1000001-0000-4000-8001-000000000001",
  COMMENT_2: "c2000002-0000-4000-8002-000000000002",
  COMMENT_3: "c3000003-0000-4000-8003-000000000003",
  COMMENT_4: "c4000004-0000-4000-8004-000000000004",
  COMMENT_5: "c5000005-0000-4000-8005-000000000005",
} as const;

// --- Helpers ---

export const makeAuthor = (id: string, name: string, username: string) => ({
  id,
  username,
  email: `${username}@example.com`,
  name,
  image: null,
});

export const VIEWER_AUTHOR = makeAuthor(STORY_UUIDS.USER_VIEWER, "Viewer", "viewer");

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
  },
  {
    id: STORY_UUIDS.COMMENT_2,
    postId,
    parentId: null,
    authorId: STORY_UUIDS.USER_2,
    author: makeAuthor(STORY_UUIDS.USER_2, "Bob Smith", "bobsmith"),
    content: "I had a similar experience. The key takeaway for me was to always test edge cases.",
    createdAt: tenMinAgo,
    updatedAt: tenMinAgo,
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
  },
  {
    id: STORY_UUIDS.COMMENT_2,
    postId,
    parentId: STORY_UUIDS.COMMENT_1,
    authorId: STORY_UUIDS.USER_2,
    author: makeAuthor(STORY_UUIDS.USER_2, "Bob Smith", "bobsmith"),
    content: "I've been testing it on a production app. The performance gains are noticeable, especially on re-renders.",
    createdAt: tenMinAgo,
    updatedAt: tenMinAgo,
  },
  {
    id: STORY_UUIDS.COMMENT_3,
    postId,
    parentId: STORY_UUIDS.COMMENT_2,
    authorId: STORY_UUIDS.USER_3,
    author: makeAuthor(STORY_UUIDS.USER_3, "Carol White", "carolw"),
    content: "That's great to hear! Did you have to make any code changes or was it a drop-in replacement?",
    createdAt: fiveMinAgo,
    updatedAt: fiveMinAgo,
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
  },
];

export const singleComment = (postId: string): CommentType[] => [
  {
    id: STORY_UUIDS.COMMENT_1,
    postId,
    parentId: null,
    authorId: STORY_UUIDS.USER_1,
    author: makeAuthor(STORY_UUIDS.USER_1, "Alice Johnson", "alicej"),
    content: "First comment! Looking forward to the discussion.",
    createdAt: now,
    updatedAt: now,
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
  },
];

// --- MSW handler factories ---

/**
 * Creates an MSW GET handler for `GET /posts/:postId/comments` that returns
 * the provided comments array regardless of the postId in the URL.
 */
export const makeCommentsHandler = (comments: CommentType[]) =>
  http.get("*/api/posts/:postId/comments", () => HttpResponse.json(comments));

/**
 * Creates an MSW POST handler for `POST /comments/:commentId/replies` that
 * echoes back a new reply authored by the viewer user.
 */
export const makeReplyHandler = (postId: string) =>
  http.post("*/api/comments/:commentId/replies", async ({ request }) => {
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
    });
  });

/** MSW DELETE handler for `DELETE /comments/:commentId` — returns 204. */
export const deleteCommentHandler = http.delete(
  "*/api/comments/:commentId",
  () => new HttpResponse(null, { status: 204 }),
);
