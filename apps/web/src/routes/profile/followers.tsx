import { createFileRoute, Link } from '@tanstack/react-router';
import { Suspense } from 'react';
import { useSession } from '@/hooks/use-session';
import { useFollowersSuspense } from '@/hooks/use-followers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { IconArrowLeft, IconUsers } from '@tabler/icons-react';

export const Route = createFileRoute('/profile/followers')({
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

      {followers.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">No followers yet</div>
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y divide-border">
          {followers.map((follower) => {
            const initials = follower.name
              ? follower.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : follower.email.charAt(0).toUpperCase();

            return (
              <Link
                key={follower.id}
                to="/users/$userId"
                params={{ userId: follower.id }}
                className="flex gap-3 items-center py-3 px-4 mx-5 transition-colors hover:bg-muted/50"
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage
                    src={follower.image ?? undefined}
                    alt={follower.name || follower.username || undefined}
                  />
                  <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {follower.name || follower.username || 'User'}
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
