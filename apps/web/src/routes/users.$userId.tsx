import { createFileRoute } from "@tanstack/react-router";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { IconCalendar, IconMail } from "@tabler/icons-react";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/users/$userId")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { userId } = Route.useParams();
  const { data: profile, isPending, error } = useUserProfile(userId);
  const { data: session } = useSession();

  if (isPending) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">
          {error?.message || "User not found"}
        </div>
      </div>
    );
  }

  const isCurrentUser = session?.user?.id === userId;
  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile.email?.charAt(0).toUpperCase() || "U";

  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "Unknown";

  return (
    <div className="min-h-screen">
      {/* Cover Photo */}
      <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/10" />

      <div className="px-4 mx-auto max-w-2xl">
        {/* Profile Header */}
        <div className="relative">
          <div className="absolute -top-20">
            <Avatar className="w-32 h-32 rounded-full border-4 border-background">
              {profile.image ? (
                <img
                  src={profile.image}
                  alt={profile.name || "Profile"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="flex justify-center items-center w-full h-full text-4xl font-bold rounded-full border-none bg-primary text-primary-foreground">
                  {initials}
                </div>
              )}
            </Avatar>
          </div>
          <div className="flex justify-end pt-3">
            {!isCurrentUser && (
              <Button
                variant={profile.isFollowing ? "outline" : "default"}
                size="sm"
                onClick={() => {
                  // TODO: Implement follow/unfollow
                  alert("Follow feature coming soon");
                }}
              >
                {profile.isFollowing ? "Unfollow" : "Follow"}
              </Button>
            )}
            {isCurrentUser && (
              <div className="text-sm text-muted-foreground pt-1">
                This is you
              </div>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold">{profile.name || "User"}</h1>
          {profile.email && (
            <div className="flex gap-2 items-center mt-2 text-muted-foreground">
              <IconMail className="w-4 h-4" />
              <span className="text-sm">{profile.email}</span>
            </div>
          )}
          <div className="flex gap-2 items-center mt-2 text-muted-foreground">
            <IconCalendar className="w-4 h-4" />
            <span className="text-sm">Joined {joinDate}</span>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Profile Stats */}
        <div className="grid grid-cols-3 gap-6 text-center">
          <Card className="p-4">
            <div className="text-2xl font-bold">{profile.postCount}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">{profile.followingCount}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">{profile.followersCount}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </Card>
        </div>

        {/* Posts Section */}
        <div className="pb-8 mt-6">
          <h2 className="mb-4 text-xl font-semibold">Posts</h2>
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              Posts loading coming soon
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
