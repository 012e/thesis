import { IconBell } from "@tabler/icons-react";
import type { NotificationDto } from "@repo/shared-dto";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  formatNotificationTime,
  getNotificationActorInitial,
  getNotificationActorName,
  getNotificationText,
} from "./notification-utils";

interface NotificationItemProps {
  notification: NotificationDto;
  compact?: boolean;
  className?: string;
  onActivate?: (notification: NotificationDto) => void;
}

export function NotificationItem({
  notification,
  compact = false,
  className,
  onActivate,
}: NotificationItemProps) {
  const isUnread = notification.readAt === null;
  const isInteractive = Boolean(onActivate);

  const handleActivate = () => {
    onActivate?.(notification);
  };

  const content = (
    <>
      <Avatar className={cn(compact ? "size-8" : "size-10")}>
        {notification.actor?.image ? (
          <AvatarImage
            src={notification.actor.image}
            alt={`${getNotificationActorName(notification)} avatar`}
          />
        ) : null}
        <AvatarFallback className="font-semibold">
          {notification.actor ? (
            getNotificationActorInitial(notification)
          ) : (
            <IconBell className="size-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            compact && "line-clamp-2",
            isUnread && "font-semibold",
          )}
        >
          {getNotificationText(notification)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatNotificationTime(notification.createdAt)}
        </p>
      </div>

      {isUnread && <div className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
    </>
  );

  const itemClassName = cn(
    "flex w-full items-start gap-3 border-b text-left transition-colors",
    compact ? "px-4 py-3" : "px-4 py-3.5",
    isInteractive && "cursor-pointer hover:bg-accent",
    isUnread && "bg-primary/5",
    className,
  );

  if (isInteractive) {
    return (
      <button type="button" className={itemClassName} onClick={handleActivate}>
        {content}
      </button>
    );
  }

  return (
    <div role="article" className={itemClassName}>
      {content}
    </div>
  );
}
