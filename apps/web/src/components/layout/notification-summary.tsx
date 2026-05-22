import { useState, useEffect, type MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconCheck } from "@tabler/icons-react";
import type { NotificationDto } from "@repo/shared-dto";

import { NotificationItem } from "@/components/notifications/notification-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  listNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/api/notifications";

export function NotificationSummary() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [notificationsData, count] = await Promise.all([
          listNotifications({ limit: 5 }),
          getUnreadNotificationCount(),
        ]);
        setNotifications(notificationsData.notifications);
        setUnreadCount(count);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleMarkAllRead(e: MouseEvent) {
    e.stopPropagation();
    setMarkingRead(true);
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
      );
    } catch (error) {
      console.error("Failed to mark all read:", error);
    } finally {
      setMarkingRead(false);
    }
  }

  return (
    <Card className="pb-0">
      <CardHeader className="flex flex-row justify-between items-center pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={handleMarkAllRead}
            disabled={markingRead}
          >
            <IconCheck className="w-4 h-4 mr-1" />
            {markingRead ? "..." : "Mark all read"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="px-4 py-3 flex justify-center">
            <Spinner size="sm" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              compact
              onActivate={() => navigate({ to: "/notifications" })}
            />
          ))
        )}
        <div className="border-t">
          <Button
            variant="ghost"
            className="w-full cursor-pointer p-5"
            onClick={() => navigate({ to: "/notifications" })}
          >
            View all notifications
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
