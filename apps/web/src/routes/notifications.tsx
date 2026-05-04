import { createFileRoute } from '@tanstack/react-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api/notifications';
import {
  notificationsListKey,
  notificationUnreadCountKey,
} from '@/hooks/notifications';
import type { NotificationDto } from '@repo/shared-dto';
import { IconBell, IconCheck } from '@tabler/icons-react';

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNotificationText(notification: NotificationDto): string {
  const actorName =
    notification.actor?.username ?? notification.actor?.name ?? 'Someone';

  switch (notification.type) {
    case 'follow':
      return `${actorName} started following you`;
    case 'comment':
      return `${actorName} commented on your post`;
    case 'reply':
      return `${actorName} replied to your comment`;
    case 'post_update':
      return `${actorName} updated a post you subscribe to`;
    case 'post_reaction':
      return `${actorName} reacted to your post`;
    case 'comment_reaction':
      return `${actorName} reacted to your comment`;
    case 'direct_message':
      return `New message from ${actorName}`;
    default:
      return 'New notification';
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Notification Item ───────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const isUnread = notification.readAt === null;
  const actorLabel =
    notification.actor?.username ??
    notification.actor?.name ??
    '?';
  const initial = actorLabel.charAt(0).toUpperCase();

  return (
    <>
      <div
        className={`flex items-start gap-3 px-4 py-3 hover:bg-accent cursor-pointer transition-colors${isUnread ? ' bg-primary/5' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (isUnread) onMarkRead(notification.id);
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && isUnread) {
            onMarkRead(notification.id);
          }
        }}
      >
        {/* Actor avatar */}
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {initial}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm${isUnread ? ' font-semibold' : ''}`}>
            {getNotificationText(notification)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>

        {/* Unread dot */}
        {isUnread && (
          <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
        )}
      </div>
      <Separator />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function NotificationsPage() {
  const queryClient = useQueryClient();
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: notificationsListKey,
    queryFn: ({ pageParam }) =>
      listNotifications({
        limit: 20,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsListKey });
      void queryClient.invalidateQueries({ queryKey: notificationUnreadCountKey });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsListKey });
      void queryClient.invalidateQueries({ queryKey: notificationUnreadCountKey });
    },
  });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allNotifications =
    data?.pages.flatMap((page) => page.notifications) ?? [];

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <IconBell className="w-5 h-5" />
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || allNotifications.length === 0}
        >
          <IconCheck className="w-4 h-4 mr-1" />
          Mark all as read
        </Button>
      </div>

      {/* Notifications list */}
      <div>
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">
            Loading notifications...
          </div>
        )}
        {isError && (
          <div className="p-8 text-center text-destructive">
            Failed to load notifications.
          </div>
        )}
        {!isLoading && !isError && allNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <IconBell className="w-10 h-10 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}
        {allNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={(id) => markReadMutation.mutate(id)}
          />
        ))}

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="h-10">
          {isFetchingNextPage && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading more...
            </div>
          )}
        </div>

        {!hasNextPage && allNotifications.length > 0 && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            You&apos;re all caught up
          </div>
        )}
      </div>
    </>
  );
}
