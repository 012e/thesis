import { useEffect, useState } from "react";
import type { ReactNode, MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { PostMarkdown } from "@/components/ui/post-markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconMessageCircle,
  IconShare,
  IconBookmark,
  IconDots,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconTrash,
  IconEdit,
  IconBell,
} from "@tabler/icons-react";
import type { PostDto, ReactionTypeDto, PostImageDto } from "@repo/shared-dto";
import { usePostReaction } from "@/hooks/use-post-reaction";
import { useSession } from "@/hooks/use-session";
import { useOpenChat } from "@/hooks/use-open-chat";
import { useDeletePost } from "@/hooks/use-delete-post";
import { usePostSubscription } from "@/hooks/use-post-subscription";
import { CommentsDialog } from "./comments-dialog";
import { PollDisplay } from "./poll-display";
import { EditPostDialog } from "./edit-post-dialog";
import { UserAvatar } from "./user-avatar";
import { useToast as toast } from "@/hooks/use-toast";

export interface PostProps {
  post: PostDto;
  isOwner?: boolean;
  initialReactionSummary?: {
    upvotes: number;
    downvotes: number;
    userReaction: ReactionTypeDto | null;
  };
}

interface PostImagesProps {
  images: PostImageDto[];
}

function PostImages({ images }: PostImagesProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedImage =
    selectedIndex !== null ? (images[selectedIndex]?.url ?? null) : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "Escape") {
        setSelectedIndex(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((i) =>
          i !== null && i < images.length - 1 ? i + 1 : i,
        );
      }
    };

    if (selectedIndex !== null) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIndex, images.length]);

  if (images.length === 0) return null;

  const gridClass =
    images.length === 1
      ? "grid-cols-1"
      : images.length === 2
        ? "grid-cols-2"
        : images.length === 3
          ? "grid-cols-2"
          : "grid-cols-2";

  return (
    <>
      <div
        className={`grid ${gridClass} gap-0.5 mt-3 rounded-xl overflow-hidden border`}
      >
        {images.map((image, index) => {
          // For 3 images, make the first one span full width
          const isFirstOfThree = images.length === 3 && index === 0;

          return (
            <button
              key={image.key}
              type="button"
              className={`relative overflow-hidden bg-muted ${isFirstOfThree ? "col-span-2" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(index);
              }}
            >
              <img
                src={image.url}
                alt={`Post image ${index + 1}`}
                className={`w-full object-cover ${images.length === 1 ? "max-h-[512px]" : "h-40"}`}
                loading="lazy"
              />
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="flex fixed inset-0 z-50 justify-center items-center bg-black/80"
          onClick={() => setSelectedIndex(null)}
        >
          {selectedIndex !== null && selectedIndex > 0 && (
            <button
              type="button"
              className="absolute left-4 p-2 text-white rounded-full transition-colors bg-black/50 hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
              }}
            >
              <IconArrowLeft className="w-6 h-6" />
            </button>
          )}
          <img
            src={selectedImage}
            alt="Full size"
            className="object-contain max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          />
          {selectedIndex !== null && selectedIndex < images.length - 1 && (
            <button
              type="button"
              className="absolute right-4 p-2 text-white rounded-full transition-colors bg-black/50 hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((i) =>
                  i !== null && i < images.length - 1 ? i + 1 : i,
                );
              }}
            >
              <IconArrowRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </>
  );
}

interface MenuItemCardProps {
  icon: ReactNode;
  iconClassName?: string;
  label: string;
  description: string;
}

function MenuItemCard({
  icon,
  iconClassName = "bg-muted",
  label,
  description,
}: MenuItemCardProps) {
  return (
    <>
      <div
        className={`flex items-center justify-center w-8 rounded-full shrink-0 ${iconClassName} h-8`}
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium leading-tight">{label}</span>
        <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
          {description}
        </p>
      </div>
    </>
  );
}

export function Post({ post, isOwner, initialReactionSummary }: PostProps) {
  const { mutate: reactToPost, isPending: isVoting } = usePostReaction();
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { data: session } = useSession();
  const openChat = useOpenChat();

  const isOwnPost = isOwner ?? session?.user?.id === post.authorId;
  const {
    isSubscribed,
    isPending: isSubscriptionPending,
    toggle: toggleSubscription,
  } = usePostSubscription({
    postId: post.id,
    initialSubscribed: post.currentUserSubscribed,
  });

  const [reactionSummary, setReactionSummary] = useState(() => ({
    upvotes: initialReactionSummary?.upvotes ?? post.upvoteCount,
    downvotes: initialReactionSummary?.downvotes ?? post.downvoteCount,
    userReaction: initialReactionSummary?.userReaction ?? null,
  }));

  useEffect(() => {
    setReactionSummary({
      upvotes: initialReactionSummary?.upvotes ?? post.upvoteCount,
      downvotes: initialReactionSummary?.downvotes ?? post.downvoteCount,
      userReaction: initialReactionSummary?.userReaction ?? null,
    });
  }, [
    initialReactionSummary?.downvotes,
    initialReactionSummary?.upvotes,
    initialReactionSummary?.userReaction,
    post.downvoteCount,
    post.upvoteCount,
    post.id,
  ]);

  const handleAuthorClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!isOwnPost) {
      openChat(post.authorId);
    }
  };

  const { userReaction: userVote, upvotes: upvoteCount, downvotes: downvoteCount } =
    reactionSummary;

  const handleVote = (voteType: ReactionTypeDto) => {
    if (isVoting) return;

    const previousSummary = reactionSummary;
    const isRemovingVote = userVote === voteType;
    const nextVote = isRemovingVote ? null : voteType;

    const nextSummary = {
      upvotes:
        previousSummary.upvotes +
        (previousSummary.userReaction === "upvote" ? -1 : 0) +
        (nextVote === "upvote" ? 1 : 0),
      downvotes:
        previousSummary.downvotes +
        (previousSummary.userReaction === "downvote" ? -1 : 0) +
        (nextVote === "downvote" ? 1 : 0),
      userReaction: nextVote,
    };

    setReactionSummary(nextSummary);

    // If clicking the same vote type, remove the vote
    if (isRemovingVote) {
      reactToPost(
        { postId: post.id, type: null },
        { onError: () => setReactionSummary(previousSummary) },
      );
      return;
    }

    // Add new vote (replaces previous if exists)
    reactToPost(
      { postId: post.id, type: voteType },
      { onError: () => setReactionSummary(previousSummary) },
    );
  };

  // Format timestamp (simple relative time for now)
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    if (diffMins > 0) return `${diffMins}m`;
    return "now";
  };

  const subscriptionMenuItem = (
    <DropdownMenuItem
      className="gap-3 py-3 px-3 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        void toggleSubscription();
      }}
      disabled={isSubscriptionPending}
    >
      <MenuItemCard
        icon={<IconBell className="w-4 h-4" />}
        iconClassName={isSubscribed ? "bg-primary/10" : "bg-muted"}
        label={isSubscribed ? "Subscribed" : "Subscribe"}
        description={
          isSubscribed
            ? "Stop notifications for this post"
            : "Get notified about replies and reactions"
        }
      />
    </DropdownMenuItem>
  );

  return (
    <article className="p-4 transition-colors hover:bg-accent/50">
      <div className="flex gap-3 items-start">
        <UserAvatar
          userId={post.author.id}
          src={post.author.image}
          name={post.author.name}
          className="w-10 h-10 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 items-center mb-1">
            <button
              type="button"
              onClick={handleAuthorClick}
              disabled={isOwnPost}
              className="font-bold hover:underline disabled:no-underline disabled:cursor-default truncate"
            >
              {post.author.name || post.author.username || "Anonymous"}
            </button>
            <span className="text-muted-foreground truncate">
              @{post.author.username || post.author.email.split("@")[0]}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {getRelativeTime(post.createdAt)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex justify-center items-center ml-auto w-8 h-8 rounded-full transition-colors text-muted-foreground hover:bg-accent"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDots className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="end"
                className="h-full min-w-64 min-h-[3lh]"
              >
                {isOwnPost ? (
                  <>
                    <DropdownMenuItem
                      className="gap-3 py-3 px-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditOpen(true);
                      }}
                    >
                      <MenuItemCard
                        icon={<IconEdit className="w-4 h-4" />}
                        label="Edit"
                        description="Make changes to your post"
                      />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      className="gap-3 py-3 px-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <MenuItemCard
                        icon={<IconTrash className="w-4 h-4" />}
                        iconClassName="bg-destructive/10"
                        label="Delete"
                        description="Remove this post"
                      />
                    </DropdownMenuItem>
                    {subscriptionMenuItem}
                  </>
                ) : (
                  subscriptionMenuItem
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {post.content.text && (
            <div className="mb-3 leading-normal text-[15px]">
              <PostMarkdown content={post.content.text} />
            </div>
          )}

          {post.content.poll && (
            <PollDisplay postId={post.id} poll={post.content.poll} />
          )}

          {/* Post Images */}
          {post.content.images && post.content.images.length > 0 && (
            <PostImages images={post.content.images} />
          )}

          <div className="flex justify-between items-center mt-3 max-w-[425px]">
            <button
              className="flex gap-1 items-center transition-colors group text-muted-foreground hover:text-primary"
              onClick={() => setCommentsOpen(true)}
            >
              <div className="p-2 rounded-full transition-colors group-hover:bg-primary/10">
                <IconMessageCircle className="w-[18px] h-[18px]" />
              </div>
              <span className="text-sm">{post.commentCount}</span>
            </button>
            <div className="flex gap-1 items-center py-1 px-2 rounded-full bg-muted/50">
              <button
                onClick={() => handleVote("upvote")}
                disabled={isVoting}
                className={`p-1.5 rounded-full transition-all ${
                  userVote === "upvote"
                    ? "text-orange-600 bg-orange-600/10"
                    : "text-muted-foreground hover:text-orange-600 hover:bg-orange-600/10"
                }`}
                title="Upvote"
              >
                <IconArrowUp className="w-4 h-4" />
              </button>
              <div className="flex flex-col gap-0.5 items-center">
                <span className="text-xs font-medium text-muted-foreground">
                  {upvoteCount - downvoteCount}
                </span>
              </div>
              <button
                onClick={() => handleVote("downvote")}
                disabled={isVoting}
                className={`p-1.5 rounded-full transition-all ${
                  userVote === "downvote"
                    ? "text-blue-600 bg-blue-600/10"
                    : "text-muted-foreground hover:text-blue-600 hover:bg-blue-600/10"
                }`}
                title="Downvote"
              >
                <IconArrowDown className="w-4 h-4" />
              </button>
            </div>
            <button className="flex gap-1 items-center transition-colors group text-muted-foreground hover:text-primary">
              <div className="p-2 rounded-full transition-colors group-hover:bg-primary/10">
                <IconBookmark className="w-[18px] h-[18px]" />
              </div>
            </button>
            <button
              className="flex gap-1 items-center transition-colors group text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                const url = `${window.location.origin}/posts/${post.id}`;
                navigator.clipboard.writeText(url).then(() => {
                  toast.success("Link copied to clipboard!");
                });
              }}
              title="Share via link"
            >
              <div className="p-2 rounded-full transition-colors group-hover:bg-primary/10">
                <IconShare className="w-[18px] h-[18px]" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Comments Dialog */}
      <CommentsDialog
        post={post}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />

      {/* Edit Post Dialog */}
      <EditPostDialog post={post} open={editOpen} onOpenChange={setEditOpen} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The post will be permanently deleted.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={isDeleting}
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={isDeleting}
              onClick={() => {
                deletePost(post.id, {
                  onSuccess: () => setDeleteConfirmOpen(false),
                });
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
