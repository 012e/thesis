import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  IconHeart,
  IconMessageCircle,
  IconRepeat,
  IconShare,
  IconBookmark,
  IconDots,
} from "@tabler/icons-react";
import type { PostDto } from "@repo/shared-dto";

export interface PostProps {
  post: PostDto;
}

export function Post({ post }: PostProps) {
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
      <div className="flex gap-3">
        <Avatar className="flex-shrink-0 w-10 h-10">
          <div className="flex justify-center items-center w-full h-full font-semibold rounded-full bg-primary text-primary-foreground">
            {authorInitial}
          </div>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 items-center mb-1">
            <span className="font-bold truncate">
              {post.author.name || post.author.username || "Anonymous"}
            </span>
            <span className="text-muted-foreground truncate">
              @{post.author.username || post.author.email.split("@")[0]}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {getRelativeTime(post.createdAt)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto w-8 h-8 rounded-full"
            >
              <IconDots className="w-4 h-4" />
            </Button>
          </div>
          <div className="mb-3 leading-normal text-[15px]">
            {post.content.text}
          </div>
          <div className="flex justify-between items-center max-w-[425px]">
            <button className="flex gap-1 items-center transition-colors group text-muted-foreground hover:text-primary">
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
            <button className="flex gap-1 items-center transition-colors hover:text-pink-600 group text-muted-foreground">
              <div className="p-2 rounded-full transition-colors group-hover:bg-pink-600/10">
                <IconHeart className="w-[18px] h-[18px]" />
              </div>
              <span className="text-sm">0</span>
            </button>
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
    </article>
  );
}
