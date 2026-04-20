import type { Meta, StoryObj } from "@storybook/react";
import { CommentTree } from "./comment-tree";
import { http, HttpResponse } from "msw";
import type { CommentType } from "@repo/rest-contracts";

const now = new Date().toISOString();
const fiveMinAgo = new Date(Date.now() - 300000).toISOString();
const tenMinAgo = new Date(Date.now() - 600000).toISOString();
const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

const makeAuthor = (id: string, name: string, username: string) => ({
  id,
  username,
  email: `${username}@example.com`,
  name,
  image: null,
});

const postId = "post-1";

const flatComments: CommentType[] = [
  {
    id: "c-1",
    postId,
    parentId: null,
    authorId: "user-1",
    author: makeAuthor("user-1", "Alice Johnson", "alicej"),
    content: "This is a really insightful post. Thanks for sharing!",
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
  },
  {
    id: "c-2",
    postId,
    parentId: null,
    authorId: "user-2",
    author: makeAuthor("user-2", "Bob Smith", "bobsmith"),
    content: "I had a similar experience. The key takeaway for me was to always test edge cases.",
    createdAt: tenMinAgo,
    updatedAt: tenMinAgo,
  },
  {
    id: "c-3",
    postId,
    parentId: null,
    authorId: "user-3",
    author: makeAuthor("user-3", "Carol White", "carolw"),
    content: "Bookmarked for later. Great discussion happening here.",
    createdAt: fiveMinAgo,
    updatedAt: fiveMinAgo,
  },
];

const nestedComments: CommentType[] = [
  {
    id: "c-1",
    postId,
    parentId: null,
    authorId: "user-1",
    author: makeAuthor("user-1", "Alice Johnson", "alicej"),
    content: "What do you all think about the new React compiler?",
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
  },
  {
    id: "c-2",
    postId,
    parentId: "c-1",
    authorId: "user-2",
    author: makeAuthor("user-2", "Bob Smith", "bobsmith"),
    content: "I've been testing it on a production app. The performance gains are noticeable, especially on re-renders.",
    createdAt: tenMinAgo,
    updatedAt: tenMinAgo,
  },
  {
    id: "c-3",
    postId,
    parentId: "c-2",
    authorId: "user-3",
    author: makeAuthor("user-3", "Carol White", "carolw"),
    content: "That's great to hear! Did you have to make any code changes or was it a drop-in replacement?",
    createdAt: fiveMinAgo,
    updatedAt: fiveMinAgo,
  },
  {
    id: "c-4",
    postId,
    parentId: "c-2",
    authorId: "user-1",
    author: makeAuthor("user-1", "Alice Johnson", "alicej"),
    content: "I'd love to see some benchmarks if you have them.",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "c-5",
    postId,
    parentId: null,
    authorId: "user-4",
    author: makeAuthor("user-4", "Dave Lee", "davelee"),
    content: "Off-topic but the new `use` hook is also a game changer.",
    createdAt: fiveMinAgo,
    updatedAt: fiveMinAgo,
  },
];

const singleComment: CommentType[] = [
  {
    id: "c-1",
    postId,
    parentId: null,
    authorId: "user-1",
    author: makeAuthor("user-1", "Alice Johnson", "alicej"),
    content: "First comment! Looking forward to the discussion.",
    createdAt: now,
    updatedAt: now,
  },
];

// --- MSW handlers ---

const sessionHandler = http.get("*/api/auth/session", () =>
  HttpResponse.json({
    session: {
      id: "sess-1",
      userId: "user-viewer",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "Storybook",
    },
    user: {
      id: "user-viewer",
      email: "viewer@example.com",
      emailVerified: true,
      name: "Viewer",
      createdAt: now,
      updatedAt: now,
      username: "viewer",
    },
  }),
);

const makeCommentsHandler = (comments: CommentType[]) =>
  http.get("*/posts/:postId/comments", () => HttpResponse.json(comments));

// Mock the reply creation endpoint
const replyHandler = http.post("*/api/comments/:commentId/replies", async ({ request }) => {
  const body = (await request.json()) as { content: string };
  return HttpResponse.json({
    id: crypto.randomUUID(),
    postId,
    parentId: "c-1",
    authorId: "user-viewer",
    author: makeAuthor("user-viewer", "Viewer", "viewer"),
    content: body.content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

// Mock the delete endpoint
const deleteHandler = http.delete("*/api/comments/:commentId", () =>
  new HttpResponse(null, { status: 204 }),
);

const baseHandlers = [sessionHandler, replyHandler, deleteHandler];

// --- Story config ---

const meta = {
  title: "Components/CommentTree",
  component: CommentTree,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px] p-4 border rounded-lg bg-background text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommentTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flat: Story = {
  args: {
    postId,
    isRoot: true,
  },
  parameters: {
    msw: { handlers: [makeCommentsHandler(flatComments), ...baseHandlers] },
  },
};

export const Nested: Story = {
  args: {
    postId,
    isRoot: true,
  },
  parameters: {
    msw: { handlers: [makeCommentsHandler(nestedComments), ...baseHandlers] },
  },
};

export const SingleComment: Story = {
  args: {
    postId,
    isRoot: true,
  },
  parameters: {
    msw: { handlers: [makeCommentsHandler(singleComment), ...baseHandlers] },
  },
};

export const Empty: Story = {
  args: {
    postId,
    isRoot: true,
  },
  parameters: {
    msw: { handlers: [makeCommentsHandler([]), ...baseHandlers] },
  },
};
