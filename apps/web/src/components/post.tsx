import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  IconRepeat,
  IconShare,
  IconBookmark,
  IconDots,
  IconArrowUp,
  IconArrowDown,
  IconTrash,
  IconEdit,
  IconBell,
} from "@tabler/icons-react";
import type { PostDto, ReactionTypeDto, PostImageDto } from "@repo/shared-dto";
import { usePostReaction } from "@/hooks/use-post-reaction";
import { useSession } from "@/hooks/use-session";
import { useOpenChat } from "@/hooks/use-open-chat";
import { useDeletePost } from "@/hooks/use-delete-post";
import { CommentsDialog } from "./comments-dialog";
import { PollDisplay } from "./poll-display";
import { EditPostDialog } from "./edit-post-dialog";
import { toast } from "sonner";

export interface PostProps {
  post: PostDto;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
                setSelectedImage(image.url);
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export function Post({ post, initialReactionSummary }: PostProps) {
  const { mutate: reactToPost, isPending: isVoting } = usePostReaction();
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { data: session } = useSession();
  const openChat = useOpenChat();

  const isOwnPost = session?.user?.id === post.authorId;

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwnPost) {
      openChat(post.authorId);
    }
  };

  const userVote = initialReactionSummary?.userReaction ?? null;
  const upvoteCount = initialReactionSummary?.upvotes ?? post.upvoteCount;
  const downvoteCount = initialReactionSummary?.downvotes ?? post.downvoteCount;

  const handleVote = (voteType: ReactionTypeDto) => {
    if (isVoting) return;

    // If clicking the same vote type, remove the vote
    if (userVote === voteType) {
      reactToPost({ postId: post.id, type: null });
    } else {
      // Add new vote (replaces previous if exists)
      reactToPost({ postId: post.id, type: voteType });
    }
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

  const authorInitial = (
    post.author.name?.[0] ||
    post.author.username?.[0] ||
    post.author.email[0]
  ).toUpperCase();

  return (
    <article className="p-4 transition-colors cursor-pointer hover:bg-accent/50">
      <div className="flex gap-3 items-start">
        <button
          type="button"
          onClick={handleAuthorClick}
          disabled={isOwnPost}
          className="shrink-0"
          title={
            isOwnPost
              ? undefined
              : `Message ${post.author.name ?? post.author.username}`
          }
        >
          <Avatar className="w-10 h-10">
            <AvatarImage
              src={post.author.image ?? undefined}
              alt={post.author.name || post.author.username || undefined}
            />
            <AvatarFallback className="font-semibold bg-primary text-primary-foreground">
              {authorInitial}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 items-center mb-1">
            <button
              type="button"
              onClick={handleAuthorClick}
              disabled={isOwnPost}
              className="font-bold truncate hover:underline disabled:cursor-default disabled:no-underline"
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
                className="ml-auto flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent transition-colors text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDots className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                {isOwnPost ? (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditOpen(true);
                      }}
                    >
                      <IconEdit className="w-4 h-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <IconTrash className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info("Post notifications coming soon!");
                    }}
                  >
                    <IconBell className="w-4 h-4" />
                    Subscribe to post notifications
                  </DropdownMenuItem>
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

          <div className="flex justify-between items-center max-w-[425px] mt-3">
            <button
              className="flex gap-1 items-center transition-colors group text-muted-foreground hover:text-primary"
              onClick={() => setCommentsOpen(true)}
            >
              <div className="p-2 rounded-full transition-colors group-hover:bg-primary/10">
                <IconMessageCircle className="w-[18px] h-[18px]" />
              </div>
              <span className="text-sm">0</span>
            </button>
            <button className="flex gap-1 items-center transition-colors hover:text-green-600 group text-muted-foreground">
              <div className="p-2 rounded-full transition-colors group-hover:bg-green-600/10">
                <IconRepeat className="w-[18px] h-[18px]" />
              </div>
              <span className="text-sm">0</span>
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
            <button className="flex gap-1 items-center transition-colors group text-muted-foreground hover:text-primary">
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
      <EditPostDialog
        post={post}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

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
            <Button
              variant="outline"
              className="rounded-full"
              disabled={isDeleting}
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
