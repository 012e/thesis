import type {
  NotificationCommentContextDto,
  NotificationDto,
  NotificationPostContextDto,
} from "@repo/shared-dto";

export function getNotificationActorName(
  notification: NotificationDto,
): string {
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
  const payload = notification.payload;

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
      return `${actorName} ${getReactionVerb(payload)} your post`;
    case "comment_reaction":
      return `${actorName} ${getReactionVerb(payload)} your comment`;
    case "direct_message":
      return `New message from ${actorName}`;
    default:
      return "New notification";
  }
}

export function getNotificationContextText(
  notification: NotificationDto,
): string | null {
  const payload = notification.payload;

  switch (notification.type) {
    case "comment": {
      const post = getPayloadPost(payload);
      return joinContextParts([
        getQuotedPreview("Comment", getPayloadPreview(payload)),
        post ? `on ${formatPostContext(post)}` : null,
      ]);
    }
    case "reply": {
      const parentComment = getPayloadParentComment(payload);
      const post = getPayloadPost(payload);
      return joinContextParts([
        getQuotedPreview("Reply", getPayloadPreview(payload)),
        parentComment ? `to ${formatCommentContext(parentComment)}` : null,
        post ? `on ${formatPostContext(post)}` : null,
      ]);
    }
    case "post_update": {
      const post = getPayloadPost(payload);
      return post
        ? `Updated ${formatPostContext(post)}`
        : getQuotedPreview("Post", getPayloadPreview(payload));
    }
    case "post_reaction": {
      const post = getPayloadPost(payload);
      return post ? formatPostContext(post) : null;
    }
    case "comment_reaction": {
      const comment = getPayloadComment(payload);
      const post = getPayloadPost(payload);
      return joinContextParts([
        comment ? formatCommentContext(comment) : null,
        post ? `on ${formatPostContext(post)}` : null,
      ]);
    }
    case "direct_message":
      return getQuotedPreview("Message", getPayloadPreview(payload));
    case "follow":
      return null;
    default:
      return null;
  }
}

function getPayloadPreview(payload: NotificationDto["payload"]): string | null {
  return "preview" in payload ? payload.preview : null;
}

function getPayloadPost(
  payload: NotificationDto["payload"],
): NotificationPostContextDto | null {
  return "post" in payload && payload.post ? payload.post : null;
}

function getPayloadComment(
  payload: NotificationDto["payload"],
): NotificationCommentContextDto | null {
  return "comment" in payload && payload.comment ? payload.comment : null;
}

function getPayloadParentComment(
  payload: NotificationDto["payload"],
): NotificationCommentContextDto | null {
  return "parentComment" in payload && payload.parentComment
    ? payload.parentComment
    : null;
}

function getReactionVerb(payload: NotificationDto["payload"]): string {
  if (!("reactionType" in payload)) return "reacted to";
  return payload.reactionType === "upvote" ? "upvoted" : "downvoted";
}

function formatPostContext(post: NotificationPostContextDto): string {
  const preview = post.preview ? quote(post.preview) : "a post";
  return `${preview} by ${formatContextUser(post.author)}`;
}

function formatCommentContext(comment: NotificationCommentContextDto): string {
  return `${quote(comment.preview)} by ${formatContextUser(comment.author)}`;
}

function formatContextUser(user: {
  username: string | null;
  name: string | null;
}) {
  return user.name || (user.username ? `@${user.username}` : "someone");
}

function getQuotedPreview(
  label: string,
  preview: string | null,
): string | null {
  return preview ? `${label}: ${quote(preview)}` : null;
}

function quote(value: string): string {
  return `"${value}"`;
}

function joinContextParts(parts: Array<string | null>): string | null {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length > 0 ? present.join(" ") : null;
}

export function formatNotificationTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.max(0, Math.floor(diff / 1_000));
  if (seconds < 60) return formatRelativeTime(-seconds, "second");

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return formatRelativeTime(-minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatRelativeTime(-hours, "hour");

  const days = Math.floor(hours / 24);
  if (days < 3) return formatRelativeTime(-days, "day");

  return new Date(dateStr).toLocaleDateString();
}

function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
): string {
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    value,
    unit,
  );
}
