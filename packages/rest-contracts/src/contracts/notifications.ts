import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { Notification, ListNotificationsQuery } from '../schemas/notification';

const c = initContract();

export const notificationsContract = c.router({
  listNotifications: {
    method: 'GET',
    path: '/notifications',
    query: ListNotificationsQuery,
    responses: {
      200: z.object({
        notifications: z.array(Notification),
        nextCursor: z.string().datetime().nullable(),
      }),
    },
    summary: 'List notifications for the current user (cursor-based, newest-first)',
  },

  /**
   * Placed before getNotification to prevent /notifications/:id matching
   * the literal segment "unread-count".
   */
  getNotificationUnreadCount: {
    method: 'GET',
    path: '/notifications/unread-count',
    responses: {
      200: z.object({ count: z.number().int().nonnegative() }),
    },
    summary: 'Get total unread notification count for the current user',
  },

  markRead: {
    method: 'PATCH',
    path: '/notifications/:id/read',
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({}),
    responses: {
      200: Notification,
      404: z.null(),
    },
    summary: 'Mark a single notification as read',
  },

  markAllRead: {
    method: 'PATCH',
    path: '/notifications/read-all',
    body: z.object({}),
    responses: {
      200: z.object({ updated: z.number().int().nonnegative() }),
    },
    summary: 'Mark all unread notifications as read for the current user',
  },
});

export type NotificationsContract = typeof notificationsContract;
