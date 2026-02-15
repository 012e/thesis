import { createFileRoute } from "@tanstack/react-router";
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
import { PostComposer } from "@/components/ui/post-composer";

export const Route = createFileRoute("/")({
  component: Index,
});

// Sample posts data for demonstration
const samplePosts = [
  {
    id: 1,
    author: {
      name: "Elon Musk",
      username: "elonmusk",
      verified: true,
      avatar: "E",
    },
    content: "Dragon is docked with @SpaceStation",
    timestamp: "14h",
    stats: {
      replies: 245,
      reposts: 892,
      likes: 5420,
    },
  },
  {
    id: 2,
    author: {
      name: "User Name",
      username: "username",
      verified: false,
      avatar: "U",
    },
    content:
      "This is a sample post to demonstrate the feed layout. The timeline will show posts like this one.",
    timestamp: "2h",
    stats: {
      replies: 12,
      reposts: 45,
      likes: 234,
    },
  },
];

function Index() {
  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="flex items-center">
          <button className="flex-1 py-4 font-bold text-center transition-colors hover:bg-accent">
            For you
          </button>
          <button className="flex-1 py-4 font-semibold text-center transition-colors text-muted-foreground hover:bg-accent">
            Following
          </button>
        </div>
      </div>
      <PostComposer />
      <div className="divide-y">
        {samplePosts.map((post) => (
          <article
            key={post.id}
            className="p-4 transition-colors cursor-pointer hover:bg-accent/50"
          >
            <div className="flex gap-3">
              <Avatar className="flex-shrink-0 w-10 h-10">
                <div className="flex justify-center items-center w-full h-full font-semibold rounded-full bg-primary text-primary-foreground">
                  {post.author.avatar}
                </div>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-center mb-1">
                  <span className="font-bold truncate">{post.author.name}</span>
                  {post.author.verified && (
                    <svg
                      viewBox="0 0 24 24"
                      aria-label="Verified account"
                      className="w-5 h-5 fill-primary"
                    >
                      <g>
                        <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"></path>
                      </g>
                    </svg>
                  )}
                  <span className="text-muted-foreground truncate">
                    @{post.author.username}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {post.timestamp}
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
                  {post.content}
                </div>
                <div className="flex justify-between items-center max-w-[425px]">
                  <button className="flex gap-1 items-center transition-colors group text-muted-foreground hover:text-primary">
                    <div className="p-2 rounded-full transition-colors group-hover:bg-primary/10">
                      <IconMessageCircle className="w-[18px] h-[18px]" />
                    </div>
                    <span className="text-sm">{post.stats.replies}</span>
                  </button>
                  <button className="flex gap-1 items-center transition-colors hover:text-green-600 group text-muted-foreground">
                    <div className="p-2 rounded-full transition-colors group-hover:bg-green-600/10">
                      <IconRepeat className="w-[18px] h-[18px]" />
                    </div>
                    <span className="text-sm">{post.stats.reposts}</span>
                  </button>
                  <button className="flex gap-1 items-center transition-colors hover:text-pink-600 group text-muted-foreground">
                    <div className="p-2 rounded-full transition-colors group-hover:bg-pink-600/10">
                      <IconHeart className="w-[18px] h-[18px]" />
                    </div>
                    <span className="text-sm">{post.stats.likes}</span>
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
        ))}
      </div>
    </>
  );
}
