import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { useUserProfileSuspense } from "@/hooks/use-user-profile";
import { useUserPostsSuspense } from "@/hooks/use-user-posts";
import { PageSpinner } from "@/components/ui/spinner";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { ProfileView } from "@/components/profile/profile-view";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
type SessionData = NonNullable<ReturnType<typeof useSession>["data"]>;

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

export function ProfilePage() {
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

export function ProfileContent({
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

  return (
    <>
      {impersonatedBy && <ImpersonationBanner adminName={impersonatedBy} />}
      <ProfileView
        profile={{
          id: userId,
          name: session.user.name || null,
          email: session.user.email || null,
          image: profile?.image || null,
          coverPhoto: profile?.coverPhoto || null,
          bio: profile?.bio ?? null,
          postCount: profile?.postCount ?? 0,
          followingCount: profile?.followingCount ?? 0,
          followersCount: profile?.followersCount ?? 0,
          isFollowing: false,
          createdAt: session.user.createdAt
            ? new Date(session.user.createdAt).toISOString()
            : null,
        }}
        posts={userPosts}
        isCurrentUser={true}
        showFollowingLinks={true}
        onEdit={() => setIsEditDialogOpen(true)}
        editDialog={
          <EditProfileDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            userId={userId}
            defaultValues={{
              name: session.user.name || "",
              image: profile?.image || "",
              bio: profile?.bio ?? null,
            }}
            onSuccess={() => {
              refetch();
            }}
          />
        }
      />
    </>
  );
}
