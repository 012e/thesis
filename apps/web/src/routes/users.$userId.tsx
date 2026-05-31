import { createFileRoute } from "@tanstack/react-router";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useUserPosts } from "@/hooks/use-user-posts";
import { useSession } from "@/hooks/use-session";
import { useFollow } from "@/hooks/use-follow";
import { useOpenDmSidebar } from "@/hooks/use-open-dm-sidebar";
import { ProfileView } from "@/components/profile/profile-view";
import { PageSpinner } from "@/components/ui/spinner";
import { setGlobalAIContext } from "@/lib/atoms/ai-context";

export const Route = createFileRoute("/users/$userId")({
  beforeLoad: () => {
    setGlobalAIContext({ type: "none" });
  },
  component: UserProfilePage,
});

export function UserProfilePage() {
  const { userId } = Route.useParams();
  const { data: profile, isPending, error } = useUserProfile(userId);
  const userPosts = useUserPosts(userId);
  const { data: session } = useSession();
  const openDmSidebar = useOpenDmSidebar();
  const {
    isFollowing,
    isPending: isFollowPending,
    toggle: toggleFollow,
  } = useFollow({
    userId,
    initialIsFollowing: profile?.isFollowing ?? false,
  });

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

  return (
    <ProfileView
      profile={{
        id: profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.image,
        coverPhoto: profile.coverPhoto,
        bio: profile.bio,
        postCount: profile.postCount,
        followingCount: profile.followingCount,
        followersCount: profile.followersCount,
        isFollowing,
        createdAt: profile.createdAt,
      }}
      postsData={userPosts.data}
      fetchNextPage={userPosts.fetchNextPage}
      hasNextPage={userPosts.hasNextPage}
      isFetchingNextPage={userPosts.isFetchingNextPage}
      isLoadingPosts={userPosts.isLoading}
      isPostsError={userPosts.isError}
      postsError={userPosts.error}
      isCurrentUser={isCurrentUser}
      showFollowingLinks={false}
      onFollow={toggleFollow}
      onMessage={() => void openDmSidebar(userId)}
      followPending={isFollowPending}
    />
  );
}
