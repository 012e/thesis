import { Link } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { IconCalendar, IconMail, IconEdit } from "@tabler/icons-react";
import type { PostDto } from "@repo/shared-dto";
import { Post } from "@/components/post";
import { uploadImages } from "@/lib/api/uploads";
import { updateCoverPhoto } from "@/lib/api/users";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";

export interface ProfileViewProps {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    coverPhoto: string | null;
    bio: string | null;
    postCount: number;
    followingCount: number;
    followersCount: number;
    isFollowing: boolean;
    createdAt: string | null;
  };
  posts: PostDto[];
  isCurrentUser: boolean;
  showFollowingLinks?: boolean;
  onEdit?: () => void;
  onFollow?: () => void;
  followPending?: boolean;
  editDialog?: ReactNode;
}

export function ProfileView({
  profile,
  posts,
  isCurrentUser,
  showFollowingLinks = false,
  onEdit,
  onFollow,
  followPending = false,
  editDialog,
}: ProfileViewProps) {
  const queryClient = useQueryClient();
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

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

  const handleAvatarClick = () => {
    if (isCurrentUser && onEdit) {
      onEdit();
    }
  };

  const handleCoverPhotoChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !isCurrentUser || isCoverUploading) {
      return;
    }

    setIsCoverUploading(true);
    try {
      const uploadResult = await uploadImages([file]);
      const uploadedImage = uploadResult.images[0];

      if (!uploadedImage) {
        throw new Error("No image returned from upload");
      }

      await updateCoverPhoto(uploadedImage.url);
      await queryClient.invalidateQueries({
        queryKey: ["users", profile.id, "profile"],
      });

      toast.success("Cover photo updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update cover photo";
      toast.error(message);
    } finally {
      setIsCoverUploading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Cover Photo */}
      <div className="relative h-48 bg-linear-to-r from-primary/20 to-primary/10">
        {profile.coverPhoto && (
          <img
            src={profile.coverPhoto}
            alt={`${profile.name || "User"} cover photo`}
            className="object-cover absolute inset-0 w-full h-full"
          />
        )}
        {isCurrentUser && (
          <>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverPhotoChange}
              disabled={isCoverUploading}
            />
            <button
              type="button"
              className="group flex absolute inset-0 justify-center items-center bg-black/0 hover:bg-black/35 transition-colors cursor-pointer"
              onClick={() => coverFileInputRef.current?.click()}
              aria-label="Change cover photo"
              disabled={isCoverUploading}
            >
              <span className="flex gap-2 items-center px-3 py-2 text-sm text-foreground opacity-0 transition-opacity bg-background/50 group-hover:opacity-100">
                <IconEdit className="w-4 h-4" />
                {isCoverUploading ? "Uploading..." : "Edit cover photo"}
              </span>
            </button>
          </>
        )}
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Profile Header */}
        <div className="relative px-4">
          <div className="absolute -top-20">
            <button
              className={`group relative w-32 h-32 rounded-full focus:outline-none ${
                isCurrentUser ? "cursor-pointer" : "cursor-default"
              }`}
              onClick={handleAvatarClick}
              aria-label={
                isCurrentUser ? "Edit profile picture" : "Profile picture"
              }
              disabled={!isCurrentUser}
            >
              <Avatar className="w-32 h-32 rounded-full border-4 border-background">
                {profile.image ? (
                  <AvatarImage
                    src={profile.image}
                    alt={profile.name || "Profile"}
                    className="object-cover w-full h-full rounded-full"
                  />
                ) : (
                  <AvatarFallback className="flex justify-center items-center w-full h-full text-4xl font-bold rounded-full border-none bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              {isCurrentUser && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/40 transition-colors">
                  <IconEdit className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </button>
          </div>
          <div className="flex justify-end pt-3">
            {isCurrentUser ? (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <IconEdit className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <Button
                variant={profile.isFollowing ? "outline" : "default"}
                size="sm"
                onClick={onFollow}
                disabled={followPending}
              >
                {followPending
                  ? "Loading..."
                  : profile.isFollowing
                    ? "Unfollow"
                    : "Follow"}
              </Button>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="mt-4 px-4">
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
          {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
        </div>

        <div className="my-6" />

        {/* Profile Stats */}
        <div className="grid grid-cols-3 gap-6 text-center px-4">
          <Card className="p-4">
            <div className="text-2xl font-bold">{profile.postCount}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </Card>
          {showFollowingLinks ? (
            <>
              <Link to="/profile/following">
                <Card className="p-4 transition-colors cursor-pointer hover:bg-muted/50">
                  <div className="text-2xl font-bold">
                    {profile.followingCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </Card>
              </Link>
              <Link to="/profile/followers">
                <Card className="p-4 transition-colors cursor-pointer hover:bg-muted/50">
                  <div className="text-2xl font-bold">
                    {profile.followersCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </Card>
              </Link>
            </>
          ) : (
            <>
              <Card className="p-4">
                <div className="text-2xl font-bold">
                  {profile.followingCount}
                </div>
                <div className="text-sm text-muted-foreground">Following</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold">
                  {profile.followersCount}
                </div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </Card>
            </>
          )}
        </div>

        <Separator className="my-6" />

        {/* Posts Section */}
        <div className="pb-8 mt-6">
          <h2 className="mb-4 text-xl font-semibold px-4">Posts</h2>
          {posts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">No posts yet</div>
            </Card>
          ) : (
            <div className="flex flex-col divide-y">
              {posts.map((post) => (
                <Post key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Dialog - only rendered if provided */}
      {editDialog}
    </div>
  );
}
