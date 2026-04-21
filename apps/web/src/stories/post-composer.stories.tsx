import type { Meta, StoryObj } from "@storybook/react";
import { PostComposer } from "../components/ui/post-composer";
import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";
import { postsContract } from "@repo/rest-contracts";
import { createMockHandlers } from "../../.storybook/create-mock-handlers";

const meta = {
  title: "Components/PostComposer",
  component: PostComposer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px] border rounded-lg bg-background text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

const sessionUserId = faker.string.uuid();

// Better Auth session endpoint — not part of the ts-rest contract, so mocked manually.
const sessionHandler = http.get("*/api/auth/session", () =>
  HttpResponse.json({
    session: {
      id: faker.string.uuid(),
      userId: sessionUserId,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "Storybook",
    },
    user: {
      id: sessionUserId,
      email: "test@example.com",
      emailVerified: true,
      name: "Test User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      username: "testuser",
    },
  }),
);

// All posts routes are auto-mocked from the ts-rest contract.
// Responses are generated from the Zod schemas via zod-schema-faker.
const postHandlers = createMockHandlers(postsContract);

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [sessionHandler, ...postHandlers],
    },
  },
};

export const WithImagesAndPolls: Story = {
  parameters: {
    msw: {
      handlers: [
        sessionHandler,
        ...postHandlers,
        // /posts/images is an upload endpoint outside the ts-rest contract
        http.post("*/api/posts/images", async () =>
          HttpResponse.json({
            images: [{ key: "img1", url: faker.image.urlPicsumPhotos() }],
          }),
        ),
      ],
    },
  },
};
