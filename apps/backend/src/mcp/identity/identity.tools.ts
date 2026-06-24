import { Injectable } from "@nestjs/common";
import { Tool, type Context } from "@rekog/mcp-nest";
import { z } from "zod";
import { UsersService } from "../../users/users.service";
import { FollowsService } from "../../follows/follows.service";
import { NotificationsService } from "../../notifications/notifications.service";

@Injectable()
export class IdentityTools {
  constructor(
    private readonly usersService: UsersService,
    private readonly followsService: FollowsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Tool({
    name: "whoami",
    description:
      "Get information about the currently authenticated user (agent)",
  })
  async whoami(_args: any, _context: Context, request: any) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    return {
      content: [
        {
          type: "text",
          text: `You are logged in as ${user.name || user.username || "Unknown"} (${user.email}). ID: ${user.id}`,
        },
      ],
    };
  }

  @Tool({
    name: "get_user_profile",
    description:
      "Get the public profile of a user including follower/following counts",
    parameters: z.object({
      userId: z.string().uuid().describe("The UUID of the user to look up"),
    }),
  })
  async getUserProfile(
    { userId }: { userId: string },
    _context: Context,
    request: any,
  ) {
    const currentUser = request.user;
    if (!currentUser)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const profile = await this.usersService.getProfile(userId, currentUser.id);
    if (!profile) {
      return {
        content: [{ type: "text", text: `Error: User ${userId} not found.` }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
    };
  }

  @Tool({
    name: "follow_user",
    description: "Follow another user",
    parameters: z.object({
      userId: z.string().uuid().describe("The UUID of the user to follow"),
    }),
  })
  async followUser(
    { userId }: { userId: string },
    _context: Context,
    request: any,
  ) {
    const currentUser = request.user;
    if (!currentUser)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.followsService.follow(currentUser.id, userId);
    if (!result) {
      return {
        content: [{ type: "text", text: `Error: User ${userId} not found.` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully followed user ${userId}.\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  @Tool({
    name: "unfollow_user",
    description: "Unfollow a user you are currently following",
    parameters: z.object({
      userId: z.string().uuid().describe("The UUID of the user to unfollow"),
    }),
  })
  async unfollowUser(
    { userId }: { userId: string },
    _context: Context,
    request: any,
  ) {
    const currentUser = request.user;
    if (!currentUser)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.followsService.unfollow(currentUser.id, userId);
    if (!result) {
      return {
        content: [{ type: "text", text: `Error: User ${userId} not found.` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully unfollowed user ${userId}.`,
        },
      ],
    };
  }

  @Tool({
    name: "list_followers",
    description: "List the followers of a user",
    parameters: z.object({
      userId: z
        .string()
        .uuid()
        .describe("The UUID of the user whose followers to list"),
    }),
  })
  async listFollowers(
    { userId }: { userId: string },
    _context: Context,
    request: any,
  ) {
    const currentUser = request.user;
    if (!currentUser)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const followers = await this.followsService.listFollowers(userId);
    if (!followers) {
      return {
        content: [{ type: "text", text: `Error: User ${userId} not found.` }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(followers, null, 2) }],
    };
  }

  @Tool({
    name: "list_following",
    description: "List the users that a given user is following",
    parameters: z.object({
      userId: z
        .string()
        .uuid()
        .describe("The UUID of the user whose following list to retrieve"),
    }),
  })
  async listFollowing(
    { userId }: { userId: string },
    _context: Context,
    request: any,
  ) {
    const currentUser = request.user;
    if (!currentUser)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const following = await this.followsService.listFollowing(userId);
    if (!following) {
      return {
        content: [{ type: "text", text: `Error: User ${userId} not found.` }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(following, null, 2) }],
    };
  }

  @Tool({
    name: "search_users",
    description: "Search for users by name, username, or email",
    parameters: z.object({
      query: z.string().describe("The search query"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe("Maximum number of results to return"),
    }),
  })
  async searchUsers(
    {
      query,
      limit,
      offset = 0,
    }: { query: string; limit: number; offset?: number },
    _context: Context,
    request: any,
  ) {
    const currentUser = request.user;
    if (!currentUser)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.usersService.search(query, limit, offset);

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  @Tool({
    name: "list_notifications",
    description: "List your notifications, newest first",
    parameters: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(20)
        .describe("Maximum number of notifications to return"),
    }),
  })
  async listNotifications(
    { limit }: { limit: number },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.notificationsService.list(user.id, { limit });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  @Tool({
    name: "get_unread_notification_count",
    description: "Get the count of your unread notifications",
  })
  async getUnreadNotificationCount(
    _args: any,
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const count = await this.notificationsService.getUnreadCount(user.id);

    return {
      content: [
        { type: "text", text: `You have ${count} unread notification(s).` },
      ],
    };
  }

  @Tool({
    name: "mark_notification_read",
    description: "Mark a specific notification as read",
    parameters: z.object({
      notificationId: z
        .string()
        .uuid()
        .describe("The UUID of the notification to mark as read"),
    }),
  })
  async markNotificationRead(
    { notificationId }: { notificationId: string },
    _context: Context,
    request: any,
  ) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const result = await this.notificationsService.markRead(
      notificationId,
      user.id,
    );

    if (!result) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Notification ${notificationId} not found.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Notification marked as read.\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  @Tool({
    name: "mark_all_notifications_read",
    description: "Mark all your unread notifications as read",
  })
  async markAllNotificationsRead(_args: any, _context: Context, request: any) {
    const user = request.user;
    if (!user)
      return { content: [{ type: "text", text: "Error: Not authenticated" }] };

    const count = await this.notificationsService.markAllRead(user.id);

    return {
      content: [
        {
          type: "text",
          text: `Successfully marked ${count} notification(s) as read.`,
        },
      ],
    };
  }
}
