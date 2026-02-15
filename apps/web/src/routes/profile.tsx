import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/hooks/use-session";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import {
  IconCalendar,
  IconMail,
  IconUser,
  IconEdit,
} from "@tabler/icons-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: session, isPending, refetch } = useSession();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/login" />;
  }

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
      {/* Cover Photo */}
      <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/10" />

      <div className="px-4 mx-auto max-w-2xl">
        {/* Profile Header */}
        <div className="relative">
          <div className="absolute -top-20">
            <Avatar className="w-32 h-32 rounded-full border-4 border-background">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "Profile"}
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
        </div>

        <Separator className="my-6" />

        {/* Profile Stats */}
        <div className="grid grid-cols-3 gap-6 text-center">
          <Card className="p-4">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </Card>
        </div>

        {/* Account Details */}
        <Card className="p-6 mt-6">
          <h2 className="flex gap-2 items-center mb-4 text-lg font-semibold">
            <IconUser className="w-5 h-5" />
            Account Details
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-sm">{user.id}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email Verified</span>
              <span
                className={
                  user.emailVerified ? "text-green-600" : "text-yellow-600"
                }
              >
                {user.emailVerified ? "Yes" : "Pending"}
              </span>
            </div>
          </div>
        </Card>

        {/* Posts Section */}
        <div className="pb-8 mt-6">
          <h2 className="mb-4 text-xl font-semibold">Posts</h2>
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">No posts yet</div>
          </Card>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        defaultValues={{
          name: user.name || "",
          image: user.image || "",
        }}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
