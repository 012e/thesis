import type { ConversationParticipantDto } from "@repo/shared-dto";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  getParticipantDisplayName,
  getParticipantInitials,
} from "@/components/chat/chat-participant";
import { cn } from "@/lib/utils";

interface ChatParticipantAvatarProps {
  user: ConversationParticipantDto | null | undefined;
  className?: string;
  fallbackClassName?: string;
  showBadge?: boolean;
}

export function ChatParticipantAvatar({
  user,
  className,
  fallbackClassName,
  showBadge = false,
}: ChatParticipantAvatarProps) {
  const displayName = user ? getParticipantDisplayName(user) : "Chat";
  const initials = user ? getParticipantInitials(user) : "?";

  return (
    <Avatar className={cn("shrink-0", className)}>
      <AvatarImage src={user?.image ?? undefined} alt={displayName} />
      <AvatarFallback
        className={cn(
          "font-semibold bg-primary text-primary-foreground",
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
      {showBadge && <AvatarBadge className="bg-primary" />}
    </Avatar>
  );
}
