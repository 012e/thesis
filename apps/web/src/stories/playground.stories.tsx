import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";
import { PlaygroundPage } from "../routes/playground";
import { withRouter } from "../../.storybook/create-router-decorator";

const now = new Date().toISOString();
const sessionUserId = faker.string.uuid();

// --- MSW handlers ---

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
      email: "dev@example.com",
      emailVerified: true,
      name: "Dev User",
      createdAt: now,
      updatedAt: now,
      username: "devuser",
    },
  }),
);

const userProfileHandler = http.get("*/api/users/*/profile", () =>
  HttpResponse.json({
    id: sessionUserId,
    username: "devuser",
    name: "Dev User",
    email: "dev@example.com",
    image: null,
    bio: null,
    followersCount: 10,
    followingCount: 5,
  }),
);

const unreadCountHandler = http.get(
  "*/api/notifications/unread-count",
  () => HttpResponse.json({ count: 0 }),
);

const executeSuccessHandler = http.post(
  "*/api/playground/execute",
  () =>
    HttpResponse.json({
      stdout: "Hello, World!\nCurrent time: " + now,
      stderr: "",
      exitCode: 0,
      executionTime: 42,
    }),
);

const executeErrorHandler = http.post(
  "*/api/playground/execute",
  () =>
    HttpResponse.json({
      stdout: "",
      stderr: "ReferenceError: undefinedVariable is not defined\n    at <anonymous>:1:1",
      exitCode: 1,
      executionTime: 12,
    }),
);

const executePendingHandler = http.post(
  "*/api/playground/execute",
  async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 30_000));
    return HttpResponse.json({
      stdout: "done",
      stderr: "",
      exitCode: 0,
      executionTime: 30_000,
    });
  },
);

const sidebarHandlers = [sessionHandler, userProfileHandler, unreadCountHandler];

// --- Story config ---

const meta = {
  title: "Pages/Playground",
  component: PlaygroundPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [withRouter("/playground")],
} satisfies Meta<typeof PlaygroundPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [...sidebarHandlers, executeSuccessHandler],
    },
  },
};

export const WithSuccessOutput: Story = {
  parameters: {
    msw: {
      handlers: [...sidebarHandlers, executeSuccessHandler],
    },
  },
};

export const WithErrorOutput: Story = {
  parameters: {
    msw: {
      handlers: [...sidebarHandlers, executeErrorHandler],
    },
  },
};

export const RunningCode: Story = {
  parameters: {
    msw: {
      handlers: [...sidebarHandlers, executePendingHandler],
    },
  },
};
