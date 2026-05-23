import { createFileRoute } from "@tanstack/react-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { IconBell, IconCheck } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notifications";
import {
  notificationsListKey,
  notificationUnreadCountKey,
} from "@/hooks/notifications";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NotificationsPage() {
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
      void queryClient.invalidateQueries({
        queryKey: notificationUnreadCountKey,
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsListKey });
      void queryClient.invalidateQueries({
        queryKey: notificationUnreadCountKey,
      });
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
          disabled={
            markAllReadMutation.isPending || allNotifications.length === 0
          }
        >
          <IconCheck className="w-4 h-4 mr-1" />
          Mark all as read
        </Button>
      </div>

      {/* Notifications list */}
      <div>
        {isLoading && (
          <div className="flex justify-center items-center p-8 text-center text-muted-foreground">
            <Spinner />
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
            onActivate={(item) => {
              if (item.readAt === null) markReadMutation.mutate(item.id);
            }}
          />
        ))}

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="h-10">
          {isFetchingNextPage && (
            <div className="flex justify-center items-center p-4 text-center text-muted-foreground text-sm">
              <Spinner />
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
