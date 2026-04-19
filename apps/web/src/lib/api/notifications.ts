import type { NotificationDto } from '@repo/shared-dto';
import { client } from '.';

export async function listNotifications(options?: {
  limit?: number;
  before?: string;
}): Promise<{ notifications: NotificationDto[]; nextCursor: string | null }> {
  const response = await client.listNotifications({
    query: {
      limit: options?.limit,
      before: options?.before,
    },
  });
  if (response.status === 200) {
    return response.body;
  }
  throw new Error('Failed to load notifications');
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await client.getNotificationUnreadCount();
  if (response.status === 200) {
    return response.body.count;
  }
  throw new Error('Failed to load unread notification count');
}

export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationDto> {
  const response = await client.markRead({
    params: { id: notificationId },
    body: {},
  });
  if (response.status === 200) {
    return response.body;
  }
  if (response.status === 404) {
    throw new Error('Notification not found');
  }
  throw new Error('Failed to mark notification as read');
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await client.markAllRead({ body: {} });
  if (response.status === 200) {
    return response.body.updated;
  }
  throw new Error('Failed to mark all notifications as read');
}
