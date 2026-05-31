import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";
import { withRouter } from "../../.storybook/create-router-decorator";
import { ExplorePageContent } from "../routes/explore";
import { reactionsContract, pollsContract } from "@repo/rest-contracts";
import { createMockHandlers } from "../../.storybook/create-mock-handlers";
import {
  makeAuthor,
  makeCommentsHandler,
  twoComments,
  makeReplyHandler,
  deleteCommentHandler,
} from "./msw/comments";
import type { PostType, UserSearchResultType } from "@repo/rest-contracts";

// ─── Shared timestamps ────────────────────────────────────────────────────────

const now = new Date().toISOString();
const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172_800_000).toISOString();

// ─── Session handler ──────────────────────────────────────────────────────────

const VIEWER_ID = faker.string.uuid();

const sessionHandler = http.get("*/api/auth/session", () =>
  HttpResponse.json({
    session: {
      id: faker.string.uuid(),
      userId: VIEWER_ID,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "Storybook",
    },
    user: {
      id: VIEWER_ID,
      email: "viewer@example.com",
      emailVerified: true,
      name: "Viewer User",
      createdAt: now,
      updatedAt: now,
      username: "viewer",
    },
  }),
);

// ─── Mock post data ───────────────────────────────────────────────────────────

const POST_IDS = [
  faker.string.uuid(),
  faker.string.uuid(),
  faker.string.uuid(),
];

const USER_IDS = {
  alice: faker.string.uuid(),
  bob: faker.string.uuid(),
  carol: faker.string.uuid(),
};

const mockPosts: PostType[] = [
  {
    id: POST_IDS[0],
    authorId: USER_IDS.alice,
    author: makeAuthor(USER_IDS.alice, "Alice Johnson", "alicej"),
    content: {
      text: "Just shipped **full-text search** powered by ParadeDB BM25! Results are ranked by relevance using hybrid BM25 + vector similarity. Try searching for any topic on the Explore page.",
    },
    createdAt: oneHourAgo,
    updatedAt: oneHourAgo,
    upvoteCount: 42,
    downvoteCount: 1,
    currentUserReaction: null,
    currentUserUpvoted: false,
    currentUserDownvoted: false,
    currentUserSubscribed: false,
    currentUserBookmarked: false,
    tags: [],
  },
  {
    id: POST_IDS[1],
    authorId: USER_IDS.bob,
    author: makeAuthor(USER_IDS.bob, "Bob Smith", "bobsmith"),
    content: {
      text: "The Reciprocal Rank Fusion (RRF) algorithm is surprisingly effective at combining keyword and semantic search results. Here's a quick explanation:\n\n- BM25 gives you exact keyword matches\n- Vector similarity finds semantically related content\n- RRF fuses both by computing `1/(60+rank)` scores",
    },
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
    upvoteCount: 87,
    downvoteCount: 3,
    currentUserReaction: "upvote",
    currentUserUpvoted: true,
    currentUserDownvoted: false,
    currentUserSubscribed: true,
    currentUserBookmarked: false,
    tags: [],
  },
  {
    id: POST_IDS[2],
    authorId: USER_IDS.carol,
    author: makeAuthor(USER_IDS.carol, "Carol White", "carolw"),
    content: {
      text: "Excited to announce our new **search** feature is live! You can now find posts and people instantly. The search is powered by ParadeDB running on top of PostgreSQL — no Elasticsearch needed!",
    },
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
    upvoteCount: 120,
    downvoteCount: 0,
    currentUserReaction: null,
    currentUserUpvoted: false,
    currentUserDownvoted: false,
    currentUserSubscribed: false,
    currentUserBookmarked: false,
    tags: [],
  },
];

// ─── Mock user data ───────────────────────────────────────────────────────────

const mockUsers: UserSearchResultType[] = [
  {
    id: USER_IDS.alice,
    username: "alicej",
    displayUsername: "alicej",
    name: "Alice Johnson",
    image: null,
  },
  {
    id: USER_IDS.bob,
    username: "bobsmith",
    displayUsername: "bobsmith",
    name: "Bob Smith",
    image: `https://i.pravatar.cc/150?u=${USER_IDS.bob}`,
  },
  {
    id: USER_IDS.carol,
    username: "carolw",
    displayUsername: "carolw",
    name: "Carol White",
    image: null,
  },
];

// ─── Reusable MSW handler factories ──────────────────────────────────────────

const makeSearchPostsHandler = (posts: PostType[], delayMs?: number) =>
  http.get("*/api/posts/search", async () => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    return HttpResponse.json(posts);
  });

const makeSearchUsersHandler = (
  users: UserSearchResultType[],
  delayMs?: number,
) =>
  http.get("*/api/users/search", async () => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    return HttpResponse.json(users);
  });

const searchPostsErrorHandler = http.get("*/api/posts/search", () =>
  HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
);

const searchUsersErrorHandler = http.get("*/api/users/search", () =>
  HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
);

const followHandler = http.post(
  "*/api/users/*/follow",
  () => new HttpResponse(null, { status: 201 }),
);

const unfollowHandler = http.delete(
  "*/api/users/*/follow",
  () => new HttpResponse(null, { status: 200 }),
);

const reactionHandlers = createMockHandlers(reactionsContract);
const pollHandlers = createMockHandlers(pollsContract);

const baseHandlers = [
  sessionHandler,
  followHandler,
  unfollowHandler,
  ...reactionHandlers,
  ...pollHandlers,
  makeCommentsHandler(twoComments(POST_IDS[0])),
  makeReplyHandler(POST_IDS[0]),
  deleteCommentHandler,
];

// ─── Story meta ───────────────────────────────────────────────────────────────

const meta = {
  title: "Pages/Explore",
  component: ExplorePageContent,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    q: {
      control: "text",
      description: "Active search query. Empty string shows the empty prompt.",
    },
    tab: {
      control: "radio",
      options: ["posts", "people"],
      description: "Active results tab.",
    },
    onSearch: { action: "search" },
    onTabChange: { action: "tabChange" },
  },
  // Default no-op handlers — overridden by { action: "..." } argTypes at runtime
  args: {
    onSearch: () => {},
    onTabChange: () => {},
  },
  decorators: [withRouter("/explore")],
} satisfies Meta<typeof ExplorePageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * Landing state — no query entered yet.
 * Shows the empty prompt with search icon and hint text.
 */
export const EmptyState: Story = {
  args: {
    q: "",
    tab: "posts",
  },
  parameters: {
    msw: {
      handlers: [
        sessionHandler,
        makeSearchPostsHandler([]),
        makeSearchUsersHandler([]),
      ],
    },
  },
};

/**
 * Posts tab with search results returned from the API.
 * Demonstrates ranked post cards for the query "search".
 */
export const PostsWithResults: Story = {
  args: {
    q: "search",
    tab: "posts",
  },
  parameters: {
    msw: {
      handlers: [...baseHandlers, makeSearchPostsHandler(mockPosts)],
    },
  },
};

/**
 * Posts tab while results are being fetched.
 * The API intentionally delays so the spinner is visible.
 */
export const PostsLoading: Story = {
  args: {
    q: "search",
    tab: "posts",
  },
  parameters: {
    msw: {
      handlers: [...baseHandlers, makeSearchPostsHandler([], 30_000)],
    },
  },
};

/**
 * Posts tab — query returned zero results.
 */
export const PostsNoResults: Story = {
  args: {
    q: "xyznotfoundanywhere",
    tab: "posts",
  },
  parameters: {
    msw: {
      handlers: [...baseHandlers, makeSearchPostsHandler([])],
    },
  },
};

/**
 * Posts tab — the API returned a server error.
 */
export const PostsError: Story = {
  args: {
    q: "search",
    tab: "posts",
  },
  parameters: {
    msw: {
      handlers: [...baseHandlers, searchPostsErrorHandler],
    },
  },
};

/**
 * People tab with user search results.
 * Demonstrates user cards with follow/unfollow buttons.
 */
export const PeopleWithResults: Story = {
  args: {
    q: "alice",
    tab: "people",
  },
  parameters: {
    msw: {
      handlers: [...baseHandlers, makeSearchUsersHandler(mockUsers)],
    },
  },
};

/**
 * People tab — the current viewer appears in results.
 * The viewer's own card should not show a follow button.
 */
export const PeopleIncludingViewer: Story = {
  args: {
    q: "viewer",
    tab: "people",
  },
  parameters: {
    msw: {
      handlers: [
        sessionHandler,
        followHandler,
        unfollowHandler,
        makeSearchUsersHandler([
          ...mockUsers,
          {
            id: VIEWER_ID,
            username: "viewer",
            displayUsername: "viewer",
            name: "Viewer User",
            image: null,
          },
        ]),
      ],
    },
  },
};

/**
 * People tab while results are loading.
 */
export const PeopleLoading: Story = {
  args: {
    q: "alice",
    tab: "people",
  },
  parameters: {
    msw: {
      handlers: [
        sessionHandler,
        followHandler,
        unfollowHandler,
        makeSearchUsersHandler([], 30_000),
      ],
    },
  },
};

/**
 * People tab — query returned zero results.
 */
export const PeopleNoResults: Story = {
  args: {
    q: "xyznotfoundanywhere",
    tab: "people",
  },
  parameters: {
    msw: {
      handlers: [
        sessionHandler,
        followHandler,
        unfollowHandler,
        makeSearchUsersHandler([]),
      ],
    },
  },
};

/**
 * People tab — the API returned a server error.
 */
export const PeopleError: Story = {
  args: {
    q: "alice",
    tab: "people",
  },
  parameters: {
    msw: {
      handlers: [
        sessionHandler,
        followHandler,
        unfollowHandler,
        searchUsersErrorHandler,
      ],
    },
  },
};

/**
 * Posts tab with a single result — useful for reviewing layout with minimal data.
 */
export const PostsSingleResult: Story = {
  args: {
    q: "BM25",
    tab: "posts",
  },
  parameters: {
    msw: {
      handlers: [...baseHandlers, makeSearchPostsHandler([mockPosts[0]])],
    },
  },
};
