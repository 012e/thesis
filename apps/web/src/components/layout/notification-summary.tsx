import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  listNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/api/notifications";
import type { NotificationDto, NotificationTypeDto } from "@repo/shared-dto";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  IconBell,
  IconCheck,
  IconUserPlus,
  IconMessage,
  IconMessageCircle,
  IconHeart,
  IconMail,
} from "@tabler/icons-react";

function getNotificationIcon(type: NotificationTypeDto) {
  switch (type) {
    case "follow":
      return <IconUserPlus className="w-4 h-4" />;
    case "comment":
      return <IconMessage className="w-4 h-4" />;
    case "reply":
      return <IconMessageCircle className="w-4 h-4" />;
    case "post_update":
      return <IconBell className="w-4 h-4" />;
    case "post_reaction":
    case "comment_reaction":
      return <IconHeart className="w-4 h-4" />;
    case "direct_message":
      return <IconMail className="w-4 h-4" />;
    default:
      return <IconBell className="w-4 h-4" />;
  }
}

function getNotificationText(notification: NotificationDto): string {
  const actorName =
    notification.actor?.name || notification.actor?.username || "Someone";

  switch (notification.type) {
    case "follow":
      return `${actorName} followed you`;
    case "comment":
      return `${actorName} commented on your post`;
    case "reply":
      return `${actorName} replied to your comment`;
    case "post_update":
      return `${actorName} updated a post you subscribe to`;
    case "post_reaction":
      return `${actorName} reacted to your post`;
    case "comment_reaction":
      return `${actorName} reacted to your comment`;
    case "direct_message":
      return "New direct message";
    default:
      return "New notification";
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

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

  async function handleMarkAllRead(e: React.MouseEvent) {
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
            <button
              key={notification.id}
              className={`flex items-start gap-3 py-3 px-4 w-full text-left transition-colors hover:bg-accent ${
                !notification.readAt ? "bg-accent/50" : ""
              }`}
              onClick={() => navigate({ to: "/notifications" })}
            >
              <Avatar className="w-8 h-8 shrink-0">
                {notification.actor?.id ? (
                  <div className="w-full h-full bg-primary/20 rounded-full flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                ) : (
                  <div className="w-full h-full bg-muted rounded-full flex items-center justify-center">
                    <IconBell className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">
                  {getNotificationText(notification)}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatTime(notification.createdAt)}
                </span>
              </div>
              {!notification.readAt && (
                <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
              )}
            </button>
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
