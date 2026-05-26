import type { ConversationParticipantDto } from "@repo/shared-dto";

export function getParticipantDisplayName(
  user: Pick<
    ConversationParticipantDto,
    "displayUsername" | "name" | "username"
  >,
): string {
  return user.name ?? user.displayUsername ?? user.username ?? "Unknown";
}

export function getParticipantInitials(
  user: Pick<
    ConversationParticipantDto,
    "displayUsername" | "name" | "username"
  >,
): string {
  const displayName = getParticipantDisplayName(user);
  return displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
