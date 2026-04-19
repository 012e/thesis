import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSession } from "@/hooks/use-session";
import { useFollowingSuspense } from "@/hooks/use-following";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { IconArrowLeft, IconUserCheck } from "@tabler/icons-react";

export const Route = createFileRoute("/profile/following")({
  component: FollowingPage,
});

function FollowingPage() {
  const { data: session, isPending } = useSession();

  if (isPending || !session) {
    return <PageSpinner />;
  }

  return (
    <Suspense fallback={<PageSpinner />}>
      <FollowingContent userId={session.user.id} />
    </Suspense>
  );
}

function FollowingContent({ userId }: { userId: string }) {
  const { data: following } = useFollowingSuspense(userId);

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
          <IconUserCheck className="w-6 h-6" />
          Following
          {following.length > 0 && (
            <span className="text-base font-normal text-muted-foreground">
              ({following.length})
            </span>
          )}
        </h1>
      </div>

      {following.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">Not following anyone yet</div>
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {following.map((user) => {
            const initials = user.name
              ? user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : user.email.charAt(0).toUpperCase();

            return (
              <Link
                key={user.id}
                to="/users/$userId"
                params={{ userId: user.id }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={user.image ?? undefined} alt={user.name || user.username || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-sm truncate">
                    {user.name || user.username || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.username ? `@${user.username}` : user.email}
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
