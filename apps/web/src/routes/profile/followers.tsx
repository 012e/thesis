import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSession } from "@/hooks/use-session";
import { useFollowersSuspense } from "@/hooks/use-followers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { IconArrowLeft, IconUsers } from "@tabler/icons-react";

export const Route = createFileRoute("/profile/followers")({
  component: FollowersPage,
});

function FollowersPage() {
  const { data: session, isPending } = useSession();

  if (isPending || !session) {
    return <PageSpinner />;
  }

  return (
    <Suspense fallback={<PageSpinner />}>
      <FollowersContent userId={session.user.id} />
    </Suspense>
  );
}

function FollowersContent({ userId }: { userId: string }) {
  const { data: followers } = useFollowersSuspense(userId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/profile"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconUsers className="w-6 h-6" />
          Followers
          {followers.length > 0 && (
            <span className="text-base font-normal text-muted-foreground">
              ({followers.length})
            </span>
          )}
        </h1>
      </div>

      {followers.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">No followers yet</div>
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {followers.map((follower) => {
            const initials = follower.name
              ? follower.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : follower.email.charAt(0).toUpperCase();

            return (
              <Link
                key={follower.id}
                to="/users/$userId"
                params={{ userId: follower.id }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={follower.image ?? undefined} alt={follower.name || follower.username || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-sm truncate">
                    {follower.name || follower.username || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {follower.username
                      ? `@${follower.username}`
                      : follower.email}
                  </span>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
