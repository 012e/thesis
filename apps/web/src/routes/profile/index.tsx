import { createFileRoute, Link } from '@tanstack/react-router';
import { Suspense, useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { useUserProfileSuspense } from '@/hooks/use-user-profile';
import { useFollowersSuspense } from '@/hooks/use-followers';
import { useUserPostsSuspense } from '@/hooks/use-user-posts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageSpinner } from '@/components/ui/spinner';
import { EditProfileDialog } from '@/components/edit-profile-dialog';
import { Post } from '@/components/post';
import { IconCalendar, IconMail, IconEdit } from '@tabler/icons-react';
type SessionData = NonNullable<ReturnType<typeof useSession>['data']>;

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: session, isPending, refetch } = useSession();

  if (isPending || !session) {
    return <PageSpinner />;
  }

  return (
    <Suspense fallback={<PageSpinner />}>
      <ProfileContent session={session} refetch={refetch} />
    </Suspense>
  );
}

function ProfileContent({
  session,
  refetch,
}: {
  session: SessionData;
  refetch: () => void;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const userId = session.user.id;
  const { data: profile } = useUserProfileSuspense(userId);
  const { data: followers } = useFollowersSuspense(userId);
  const { data: userPosts } = useUserPostsSuspense(userId);

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || 'U';

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      })
    : 'Unknown';

  return (
    <div className="min-h-screen">
      {/* Cover Photo */}
      <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/10" />

      <div className="px-4 mx-auto max-w-2xl">
        {/* Profile Header */}
        <div className="relative">
          <div className="absolute -top-20">
            <Avatar className="w-32 h-32 rounded-full border-4 border-background">
              {user.image ? (
                <AvatarImage
                  src={user.image}
                  alt={user.name || 'Profile'}
                  className="object-cover w-full h-full rounded-full"
                />
              ) : (
                <AvatarFallback className="flex justify-center items-center w-full h-full text-4xl font-bold rounded-full border-none bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="flex justify-end pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <IconEdit className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold">{user.name || 'User'}</h1>
          {user.email && (
            <div className="flex gap-2 items-center mt-2 text-muted-foreground">
              <IconMail className="w-4 h-4" />
              <span className="text-sm">{user.email}</span>
            </div>
          )}
          <div className="flex gap-2 items-center mt-2 text-muted-foreground">
            <IconCalendar className="w-4 h-4" />
            <span className="text-sm">Joined {joinDate}</span>
          </div>
        </div>

        <div className="my-6" />

        {/* Profile Stats */}
        <div className="grid grid-cols-3 gap-6 text-center">
          <Card className="p-4">
            <div className="text-2xl font-bold">{profile?.postCount ?? 0}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </Card>
          <Link to="/profile/following">
            <Card className="p-4 transition-colors cursor-pointer hover:bg-muted/50">
              <div className="text-2xl font-bold">
                {profile?.followingCount ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">Following</div>
            </Card>
          </Link>
          <Link to="/profile/followers">
            <Card className="p-4 transition-colors cursor-pointer hover:bg-muted/50">
              <div className="text-2xl font-bold">
                {profile?.followersCount ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </Card>
          </Link>
        </div>

        <Separator className="my-6" />

        {/* Posts Section */}
        <div className="pb-8 mt-6">
          <h2 className="mb-4 text-xl font-semibold">Posts</h2>
          {userPosts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">No posts yet</div>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {userPosts.map((post) => (
                <Post key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        defaultValues={{
          name: user.name || '',
          image: user.image || '',
        }}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
