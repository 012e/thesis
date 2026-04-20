import { Post } from "./post";
import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";
import { reactionsContract, commentsContract, pollsContract, } from "@repo/rest-contracts";
import { createMockHandlers } from "../../.storybook/create-mock-handlers";
const now = new Date().toISOString();
const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
const mockAuthor = {
    id: "user-1",
    username: "janedoe",
    email: "jane@example.com",
    name: "Jane Doe",
    image: null,
};
const basePost = {
    id: "post-1",
    authorId: "user-1",
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
const postWithImages = {
    ...basePost,
    id: "post-2",
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
const postWithPoll = {
    ...basePost,
    id: "post-3",
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
            endsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        },
    },
    upvoteCount: 87,
    downvoteCount: 2,
};
const postUpvoted = {
    ...basePost,
    id: "post-4",
    content: {
        text: "This is a post the current user has already upvoted. Notice the orange highlight on the upvote button.",
    },
    upvoteCount: 15,
    downvoteCount: 1,
    currentUserReaction: "upvote",
};
// --- MSW handlers ---
const sessionHandler = http.get("*/api/auth/session", () => HttpResponse.json({
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
        name: "Viewer User",
        createdAt: now,
        updatedAt: now,
        username: "viewer",
    },
}));
const reactionHandlers = createMockHandlers(reactionsContract);
const commentHandlers = createMockHandlers(commentsContract, {
    overrides: {
        "/comments/:postId": () => ({
            comments: [
                {
                    id: "c-1",
                    postId: "post-1",
                    parentId: null,
                    authorId: "user-2",
                    author: {
                        id: "user-2",
                        username: "bobsmith",
                        email: "bob@example.com",
                        name: "Bob Smith",
                        image: null,
                    },
                    content: "Great feature! I've been waiting for this.",
                    createdAt: oneHourAgo,
                    updatedAt: oneHourAgo,
                },
                {
                    id: "c-2",
                    postId: "post-1",
                    parentId: "c-1",
                    authorId: "user-3",
                    author: {
                        id: "user-3",
                        username: "alicew",
                        email: "alice@example.com",
                        name: "Alice W",
                        image: null,
                    },
                    content: "Same here! Works perfectly on mobile too.",
                    createdAt: now,
                    updatedAt: now,
                },
            ],
        }),
    },
});
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
const allHandlers = [
    sessionHandler,
    ...reactionHandlers,
    ...commentHandlers,
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
    decorators: [
        (Story) => (<div className="w-[600px] border rounded-lg bg-background text-foreground">
        <Story />
      </div>),
    ],
};
export default meta;
export const Default = {
    args: {
        post: basePost,
        initialReactionSummary: {
            upvotes: basePost.upvoteCount,
            downvotes: basePost.downvoteCount,
            userReaction: null,
        },
    },
    parameters: {
        msw: { handlers: allHandlers },
    },
};
export const WithImages = {
    args: {
        post: postWithImages,
        initialReactionSummary: {
            upvotes: postWithImages.upvoteCount,
            downvotes: postWithImages.downvoteCount,
            userReaction: null,
        },
    },
    parameters: {
        msw: { handlers: allHandlers },
    },
};
export const WithPoll = {
    args: {
        post: postWithPoll,
        initialReactionSummary: {
            upvotes: postWithPoll.upvoteCount,
            downvotes: postWithPoll.downvoteCount,
            userReaction: null,
        },
    },
    parameters: {
        msw: { handlers: allHandlers },
    },
};
export const Upvoted = {
    args: {
        post: postUpvoted,
        initialReactionSummary: {
            upvotes: postUpvoted.upvoteCount,
            downvotes: postUpvoted.downvoteCount,
            userReaction: "upvote",
        },
    },
    parameters: {
        msw: { handlers: allHandlers },
    },
};
