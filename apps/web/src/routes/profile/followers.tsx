import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSession } from "@/hooks/use-session";
import { useFollowersSuspense } from "@/hooks/use-followers";
import { PageSpinner } from "@/components/ui/spinner";
import { IconArrowLeft, IconUsers } from "@tabler/icons-react";
import { UsersList } from "./-users-list";

export const Route = createFileRoute("/profile/followers")({
  component: FollowersPage,
});

export function FollowersPage() {
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

export function FollowersContent({ userId }: { userId: string }) {
  const { data: followers } = useFollowersSuspense(userId);

  return (
    <div className="py-6 px-4 mx-auto max-w-2xl">
      <div className="flex gap-3 items-center mb-6">
        <Link
          to="/profile"
          className="transition-colors text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex gap-2 items-center text-2xl font-bold">
          <IconUsers className="w-6 h-6" />
          Followers
          {followers.length > 0 && (
            <span className="text-base font-normal text-muted-foreground">
              ({followers.length})
            </span>
          )}
        </h1>
      </div>

      <UsersList users={followers} emptyMessage="No followers yet" />
    </div>
  );
}
