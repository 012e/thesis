import { createFileRoute } from "@tanstack/react-router";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useUserPosts } from "@/hooks/use-user-posts";
import { useSession } from "@/hooks/use-session";
import { useFollow } from "@/hooks/use-follow";
import { ProfileView } from "@/components/profile/profile-view";
import { PageSpinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/users/$userId")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { userId } = Route.useParams();
  const { data: profile, isPending, error } = useUserProfile(userId);
  const { data: posts = [] } = useUserPosts(userId);
  const { data: session } = useSession();

  if (isPending) {
    return <PageSpinner />;
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

  const {
    isFollowing,
    isPending: isFollowPending,
    toggle: toggleFollow,
  } = useFollow({
    userId,
    initialIsFollowing: profile.isFollowing,
  });

  return (
    <ProfileView
      profile={{
        id: profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.image,
        bio: profile.bio,
        postCount: profile.postCount,
        followingCount: profile.followingCount,
        followersCount: profile.followersCount,
        isFollowing,
        createdAt: profile.createdAt,
      }}
      posts={posts}
      isCurrentUser={isCurrentUser}
      showFollowingLinks={false}
      onFollow={toggleFollow}
      followPending={isFollowPending}
    />
  );
}

