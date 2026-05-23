import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSession } from "@/hooks/use-session";
import { useFollowingSuspense } from "@/hooks/use-following";
import { PageSpinner } from "@/components/ui/spinner";
import { IconArrowLeft, IconUserCheck } from "@tabler/icons-react";
import { UsersList } from "./-users-list";

export const Route = createFileRoute("/profile/following")({
  component: FollowingPage,
});

export function FollowingPage() {
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

export function FollowingContent({ userId }: { userId: string }) {
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

      <UsersList users={following} emptyMessage="Not following anyone yet" />
    </div>
  );
}
