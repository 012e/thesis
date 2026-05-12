import type { Meta, StoryObj } from "@storybook/react";
import { CommentTree } from "../components/comment-tree";
import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";
import {
  STORY_UUIDS,
  flatComments,
  nestedComments,
  singleComment,
  makeCommentsHandler,
  makeReplyHandler,
  deleteCommentHandler,
  reactToCommentHandler,
  unreactToCommentHandler,
} from "./msw/comments";

const now = new Date().toISOString();

const sessionHandler = http.get("*/api/auth/session", () =>
  HttpResponse.json({
    session: {
      id: faker.string.uuid(),
      userId: STORY_UUIDS.USER_VIEWER,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "Storybook",
    },
    user: {
      id: STORY_UUIDS.USER_VIEWER,
      email: "viewer@example.com",
      emailVerified: true,
      name: "Viewer",
      createdAt: now,
      updatedAt: now,
      username: "viewer",
    },
  }),
);

const baseHandlers = [
  sessionHandler,
  makeReplyHandler(STORY_UUIDS.POST_1),
  deleteCommentHandler,
  reactToCommentHandler,
  unreactToCommentHandler,
];

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
    postId: STORY_UUIDS.POST_1,
    isRoot: true,
  },
  parameters: {
    msw: {
      handlers: [
        makeCommentsHandler(flatComments(STORY_UUIDS.POST_1)),
        ...baseHandlers,
      ],
    },
  },
};

export const Nested: Story = {
  args: {
    postId: STORY_UUIDS.POST_1,
    isRoot: true,
  },
  parameters: {
    msw: {
      handlers: [
        makeCommentsHandler(nestedComments(STORY_UUIDS.POST_1)),
        ...baseHandlers,
      ],
    },
  },
};

export const SingleComment: Story = {
  args: {
    postId: STORY_UUIDS.POST_1,
    isRoot: true,
  },
  parameters: {
    msw: {
      handlers: [
        makeCommentsHandler(singleComment(STORY_UUIDS.POST_1)),
        ...baseHandlers,
      ],
    },
  },
};

export const Empty: Story = {
  args: {
    postId: STORY_UUIDS.POST_1,
    isRoot: true,
  },
  parameters: {
    msw: { handlers: [makeCommentsHandler([]), ...baseHandlers] },
  },
};
