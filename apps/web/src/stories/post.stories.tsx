import type { Meta, StoryObj } from "@storybook/react";
import { Post } from "../components/post";
import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";
import { reactionsContract, pollsContract } from "@repo/rest-contracts";
import { createMockHandlers } from "../../.storybook/create-mock-handlers";
import type { PostDto } from "@repo/shared-dto";
import {
  STORY_UUIDS,
  makeAuthor,
  twoComments,
  makeCommentsHandler,
  makeReplyHandler,
  deleteCommentHandler,
} from "./msw/comments";

const now = new Date().toISOString();
const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

const mockAuthor: PostDto["author"] = makeAuthor(
  STORY_UUIDS.USER_1,
  "Jane Doe",
  "janedoe",
);

const basePost: PostDto = {
  id: STORY_UUIDS.POST_1,
  authorId: STORY_UUIDS.USER_1,
  author: mockAuthor,
  content: {
    text: "Just shipped a new feature! **Dark mode** is finally here. Check it out and let me know what you think.\n\n> The best code is the code you never have to write.",
  },
  createdAt: oneHourAgo,
  updatedAt: oneHourAgo,
  upvoteCount: 42,
  downvoteCount: 3,
  currentUserReaction: null,
};

const postWithImages: PostDto = {
  ...basePost,
  id: STORY_UUIDS.POST_2,
  content: {
    text: "Here are some shots from the team offsite!",
    images: [
      { key: "img1", url: faker.image.urlPicsumPhotos({ width: 600, height: 400 }) },
      { key: "img2", url: faker.image.urlPicsumPhotos({ width: 600, height: 400 }) },
      { key: "img3", url: faker.image.urlPicsumPhotos({ width: 600, height: 400 }) },
    ],
  },
  upvoteCount: 128,
  downvoteCount: 5,
};

const postWithPoll: PostDto = {
  ...basePost,
  id: STORY_UUIDS.POST_3,
  content: {
    text: "Which framework do you prefer for building web apps?",
    poll: {
      question: "Favorite web framework?",
      options: [
        { id: "opt-1", text: "React" },
        { id: "opt-2", text: "Vue" },
        { id: "opt-3", text: "Svelte" },
        { id: "opt-4", text: "Angular" },
      ],
      allowsMultipleSelections: false,
      endsAt: new Date(Date.now() + 86_400_000 * 3).toISOString(),
    },
  },
  upvoteCount: 87,
  downvoteCount: 2,
};

const postUpvoted: PostDto = {
  ...basePost,
  id: STORY_UUIDS.POST_4,
  content: {
    text: "This is a post the current user has already upvoted. Notice the orange highlight on the upvote button.",
  },
  upvoteCount: 15,
  downvoteCount: 1,
  currentUserReaction: "upvote",
};

// --- MSW handlers ---

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
      name: "Viewer User",
      createdAt: now,
      updatedAt: now,
      username: "viewer",
    },
  }),
);

const reactionHandlers = createMockHandlers(reactionsContract);
const pollHandlers = createMockHandlers(pollsContract, {
  overrides: {
    "/polls/:postId/results": () => ({
      results: [
        { optionId: "opt-1", voteCount: 45 },
        { optionId: "opt-2", voteCount: 22 },
        { optionId: "opt-3", voteCount: 18 },
        { optionId: "opt-4", voteCount: 8 },
      ],
      totalVotes: 93,
      userVotes: [],
    }),
  },
});

const allHandlers = (postId: string) => [
  sessionHandler,
  ...reactionHandlers,
  makeCommentsHandler(twoComments(postId)),
  makeReplyHandler(postId),
  deleteCommentHandler,
  ...pollHandlers,
];

// --- Story config ---

const meta = {
  title: "Components/Post",
  component: Post,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    isOwner: {
      control: "boolean",
      description: "Override whether the current user is the post owner",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[600px] border rounded-lg bg-background text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Post>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    post: basePost,
    isOwner: false,
    initialReactionSummary: {
      upvotes: basePost.upvoteCount,
      downvotes: basePost.downvoteCount,
      userReaction: null,
    },
  },
  parameters: {
    msw: { handlers: allHandlers(STORY_UUIDS.POST_1) },
  },
};

export const OwnPost: Story = {
  args: {
    post: basePost,
    isOwner: true,
    initialReactionSummary: {
      upvotes: basePost.upvoteCount,
      downvotes: basePost.downvoteCount,
      userReaction: null,
    },
  },
  parameters: {
    msw: { handlers: allHandlers(STORY_UUIDS.POST_1) },
  },
};

export const WithImages: Story = {
  args: {
    post: postWithImages,
    initialReactionSummary: {
      upvotes: postWithImages.upvoteCount,
      downvotes: postWithImages.downvoteCount,
      userReaction: null,
    },
  },
  parameters: {
    msw: { handlers: allHandlers(STORY_UUIDS.POST_2) },
  },
};

export const WithPoll: Story = {
  args: {
    post: postWithPoll,
    initialReactionSummary: {
      upvotes: postWithPoll.upvoteCount,
      downvotes: postWithPoll.downvoteCount,
      userReaction: null,
    },
  },
  parameters: {
    msw: { handlers: allHandlers(STORY_UUIDS.POST_3) },
  },
};

export const Upvoted: Story = {
  args: {
    post: postUpvoted,
    initialReactionSummary: {
      upvotes: postUpvoted.upvoteCount,
      downvotes: postUpvoted.downvoteCount,
      userReaction: "upvote",
    },
  },
  parameters: {
    msw: { handlers: allHandlers(STORY_UUIDS.POST_4) },
  },
};
