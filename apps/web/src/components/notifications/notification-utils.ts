import type { NotificationDto } from "@repo/shared-dto";

export function getNotificationActorName(notification: NotificationDto): string {
  return notification.actor?.name || notification.actor?.username || "Someone";
}

export function getNotificationActorInitial(
  notification: NotificationDto,
): string {
  const label =
    notification.actor?.name ||
    notification.actor?.username ||
    notification.actor?.email ||
    "";

  return label.charAt(0).toUpperCase() || "?";
}

export function getNotificationText(notification: NotificationDto): string {
  const actorName = getNotificationActorName(notification);

  switch (notification.type) {
    case "follow":
      return `${actorName} started following you`;
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
      return `New message from ${actorName}`;
    default:
      return "New notification";
  }
}

export function formatNotificationTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}
