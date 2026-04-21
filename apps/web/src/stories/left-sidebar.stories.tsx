import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { LeftSidebar } from "../components/layout/left-sidebar";
import { withRouter } from "../../.storybook/create-router-decorator";

const now = new Date().toISOString();

const sessionHandler = http.get("*/api/auth/session", () =>
  HttpResponse.json({
    session: {
      id: "55555555-5555-4555-8555-555555555555",
      userId: "11111111-1111-4111-8111-111111111111",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "Storybook",
    },
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "jane@example.com",
      emailVerified: true,
      name: "Jane Doe",
      createdAt: now,
      updatedAt: now,
      username: "janedoe",
    },
  }),
);

const userProfileHandler = http.get("*/api/users/*/profile", () =>
  HttpResponse.json({
    id: "11111111-1111-4111-8111-111111111111",
    username: "janedoe",
    name: "Jane Doe",
    email: "jane@example.com",
    image: null,
    bio: null,
    followersCount: 42,
    followingCount: 13,
  }),
);

const unreadCountHandler = http.get(
  "*/api/notifications/unread-count",
  () => HttpResponse.json({ count: 0 }),
);

const unreadCountWithNotificationsHandler = http.get(
  "*/api/notifications/unread-count",
  () => HttpResponse.json({ count: 7 }),
);

const allHandlers = [sessionHandler, userProfileHandler, unreadCountHandler];

const meta = {
  title: "Layout/LeftSidebar",
  component: LeftSidebar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    withRouter("/"),
    (Story) => (
      <div className="flex h-screen bg-background text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LeftSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  args: {
    defaultCollapsed: false,
  },
  parameters: {
    msw: { handlers: allHandlers },
  },
};

export const Collapsed: Story = {
  args: {
    defaultCollapsed: true,
  },
  parameters: {
    msw: { handlers: allHandlers },
  },
};

export const WithUnreadNotifications: Story = {
  args: {
    defaultCollapsed: false,
  },
  parameters: {
    msw: {
      handlers: [
        sessionHandler,
        userProfileHandler,
        unreadCountWithNotificationsHandler,
      ],
    },
  },
};

export const CollapsedWithUnreadNotifications: Story = {
  args: {
    defaultCollapsed: true,
  },
  parameters: {
    msw: {
      handlers: [
        sessionHandler,
        userProfileHandler,
        unreadCountWithNotificationsHandler,
      ],
    },
  },
};
