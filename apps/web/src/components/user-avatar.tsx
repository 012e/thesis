import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/lib/api/users";
import { useSession } from "@/hooks/use-session";
import { useFollow } from "@/hooks/use-follow";
import { useOpenDmSidebar } from "@/hooks/use-open-dm-sidebar";
import { IconMessageCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface UserAvatarProps {
  /** The user whose profile is shown on hover. */
  userId: string;
  src?: string | null;
  name?: string | null;
  /** Avatar size — passed through to the underlying Avatar primitive. */
  className?: string;
  /** Rendered as the visible trigger; defaults to a standard Avatar circle. */
  children?: ReactNode;
}

/** Skeleton shown while the profile is loading. */
function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="flex gap-3 items-center">
        <div className="rounded-full bg-muted size-12 shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
      </div>
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-3/4" />
    </div>
  );
}

interface ProfileCardContentProps {
  userId: string;
  currentUserId: string | undefined;
}

function ProfileCardContent({
  userId,
  currentUserId,
}: ProfileCardContentProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["users", userId, "profile"],
    queryFn: () => getUserProfile(userId),
    staleTime: 1000 * 60 * 5,
    enabled: !!userId,
  });

  const isOwnProfile = currentUserId === userId;
  const openDmSidebar = useOpenDmSidebar();

  const follow = useFollow({
    userId,
    initialIsFollowing: profile?.isFollowing ?? false,
  });

  if (isLoading || !profile) {
    return <ProfileSkeleton />;
  }

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (profile.username ?? profile.email).charAt(0).toUpperCase();

  const displayName = profile.name || profile.username || "User";
  const displayHandle = profile.username
    ? `@${profile.displayUsername ?? profile.username}`
    : profile.email;

  return (
    <div className="flex flex-col gap-3 w-90">
      {/* Header row: avatar + name */}
      <div className="flex gap-3 items-start">
        <Link to="/users/$userId" params={{ userId: profile.id }}>
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={profile.image ?? undefined} alt={displayName} />
            <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            to="/users/$userId"
            params={{ userId: profile.id }}
            className="font-semibold text-sm truncate block hover:underline"
          >
            {displayName}
          </Link>
          <p className="text-xs text-muted-foreground truncate">
            {displayHandle}
          </p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-xs text-foreground line-clamp-3 leading-relaxed">
          {profile.bio}
        </p>
      )}

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">
            {profile.followersCount.toLocaleString()}
          </span>{" "}
          followers
        </span>
        <span>
          <span className="font-semibold text-foreground">
            {profile.followingCount.toLocaleString()}
          </span>{" "}
          following
        </span>
        <span>
          <span className="font-semibold text-foreground">
            {profile.postCount.toLocaleString()}
          </span>{" "}
          posts
        </span>
      </div>

      {!isOwnProfile && (
        <div className="flex gap-2">
          {follow.isFollowing && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void openDmSidebar(profile.id);
              }}
            >
              <IconMessageCircle data-icon="inline-start" />
              Message
            </Button>
          )}
          <Button
            size="sm"
            variant={follow.isFollowing ? "outline" : "default"}
            className="flex-1"
            disabled={follow.isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              follow.toggle();
            }}
          >
            {follow.isFollowing ? "Following" : "Follow"}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Drop-in replacement for `<Avatar>` that adds a hover card showing the
 * user's profile info, follow status, and a Follow/Unfollow button.
 *
 * Pass `children` to fully customise the trigger appearance, or rely on the
 * default avatar circle rendered from `src` + `name`.
 */
export function UserAvatar({
  userId,
  src,
  name,
  className,
  children,
}: UserAvatarProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const trigger = children ?? (
    <Link to="/users/$userId" params={{ userId }}>
      <Avatar className={className}>
        <AvatarImage src={src ?? undefined} alt={name ?? undefined} />
        <AvatarFallback className="font-semibold bg-primary text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
    </Link>
  );

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={400}
        closeDelay={200}
        render={<span className="cursor-pointer" />}
      >
        {trigger}
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-auto"
      >
        <ProfileCardContent userId={userId} currentUserId={currentUserId} />
      </HoverCardContent>
    </HoverCard>
  );
}
