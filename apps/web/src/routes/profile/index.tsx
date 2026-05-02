import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { useUserProfileSuspense } from "@/hooks/use-user-profile";
import { useUserPostsSuspense } from "@/hooks/use-user-posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageSpinner } from "@/components/ui/spinner";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { Post } from "@/components/post";
import { IconCalendar, IconMail, IconEdit } from "@tabler/icons-react";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
type SessionData = NonNullable<ReturnType<typeof useSession>["data"]>;

export const Route = createFileRoute("/profile/")({
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
  const { data: userPosts } = useUserPostsSuspense(userId);

  const sessionRaw = session as
    | { session?: { impersonatedBy?: string | null } }
    | undefined;
  const impersonatedBy = sessionRaw?.session?.impersonatedBy;

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || "U";

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "Unknown";

  return (
    <div className="min-h-screen">
      {impersonatedBy && <ImpersonationBanner adminName={impersonatedBy} />}

      {/* Cover Photo */}
      <div className="h-48 bg-linear-to-r from-primary/20 to-primary/10" />

      <div className="mx-auto max-w-2xl">
        {/* Profile Header */}
        <div className="relative px-4">
          <div className="absolute -top-20">
            <button
              className="group relative w-32 h-32 rounded-full focus:outline-none"
              onClick={() => setIsEditDialogOpen(true)}
              aria-label="Edit profile picture"
            >
              <Avatar className="w-32 h-32 rounded-full border-4 border-background">
                {profile?.image ? (
                  <AvatarImage
                    src={profile.image}
                    alt={user.name || "Profile"}
                    className="object-cover w-full h-full rounded-full"
                  />
                ) : (
                  <AvatarFallback className="flex justify-center items-center w-full h-full text-4xl font-bold rounded-full border-none bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/40 transition-colors">
                <IconEdit className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
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
        <div className="mt-4 px-4">
          <h1 className="text-2xl font-bold">{user.name || "User"}</h1>
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
          {profile?.bio && (
            <p className="mt-3 text-sm">{profile.bio}</p>
          )}
        </div>

        <div className="my-6" />

        {/* Profile Stats */}
        <div className="grid grid-cols-3 gap-6 text-center px-4">
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
          <h2 className="mb-4 text-xl font-semibold px-4">Posts</h2>
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
        userId={userId}
        defaultValues={{
          name: user.name || "",
          image: profile?.image || "",
          bio: profile?.bio ?? null,
        }}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
