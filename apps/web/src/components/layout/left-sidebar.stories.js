import { http, HttpResponse } from "msw";
import { LeftSidebar } from "./left-sidebar";
import { withRouter } from "../../../.storybook/create-router-decorator";
const now = new Date().toISOString();
const sessionHandler = http.get("*/api/auth/session", () => HttpResponse.json({
    session: {
        id: "sess-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        ipAddress: "127.0.0.1",
        userAgent: "Storybook",
    },
    user: {
        id: "user-1",
        email: "jane@example.com",
        emailVerified: true,
        name: "Jane Doe",
        createdAt: now,
        updatedAt: now,
        username: "janedoe",
    },
}));
const userProfileHandler = http.get("*/api/users/*/profile", () => HttpResponse.json({
    id: "user-1",
    username: "janedoe",
    name: "Jane Doe",
    email: "jane@example.com",
    image: null,
    bio: null,
    followersCount: 42,
    followingCount: 13,
}));
const unreadCountHandler = http.get("*/api/notifications/unread-count", () => HttpResponse.json({ count: 0 }));
const unreadCountWithNotificationsHandler = http.get("*/api/notifications/unread-count", () => HttpResponse.json({ count: 7 }));
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
        (Story) => (<div className="flex h-screen bg-background text-foreground">
        <Story />
      </div>),
    ],
};
export default meta;
export const Expanded = {
    args: {
        defaultCollapsed: false,
    },
    parameters: {
        msw: { handlers: allHandlers },
    },
};
export const Collapsed = {
    args: {
        defaultCollapsed: true,
    },
    parameters: {
        msw: { handlers: allHandlers },
    },
};
export const WithUnreadNotifications = {
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
export const CollapsedWithUnreadNotifications = {
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
