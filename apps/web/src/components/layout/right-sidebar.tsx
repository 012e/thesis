import { IconSearch, IconX } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const newsItems = [
  {
    category: "Other",
    title: "Bitcoin Surges Back Above $70,000 After Early February Dip",
    posts: "46.6K",
    time: "23 hours ago",
  },
  {
    category: "Entertainment",
    title:
      "Elon Musk Questions Childless AI Ethicists' Stake in Humanity's Future",
    posts: "35.2K",
    time: "23 hours ago",
  },
  {
    category: "Entertainment",
    title:
      "Shota Goshozono Leaves MAPPA After Directing Jujutsu Kaisen Season 3 Cour 1",
    posts: "2,085",
    time: "Trending now",
    trending: true,
  },
];

const trendingItems = [
  {
    location: "Trending in Vietnam",
    topic: "pga tour rise",
  },
  {
    location: "Trending in Vietnam",
    topic: "#TrendingTopic",
  },
];

export function RightSidebar() {
  return (
    <div className="overflow-hidden sticky top-0 py-2 px-4 h-screen w-[350px]">
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-12 h-11 rounded-full border-0 bg-muted"
          />
        </div>

        {/* Subscribe to Premium */}
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-xl font-bold">Subscribe to Premium</h2>
            <div className="inline-block">
              <Badge variant="secondary" className="py-0.5 px-2 text-xs">
                50% off
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Get rid of ads, see your analytics, boost your replies and unlock
              20+ features.
            </p>
            <Button className="font-bold rounded-full">Subscribe</Button>
          </CardContent>
        </Card>

        {/* Today's News */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-3">
            <h2 className="text-xl font-bold">Today's News</h2>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full"
            >
              <IconX className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {newsItems.map((item, index) => (
              <button
                key={index}
                className="py-3 px-4 w-full text-left transition-colors hover:bg-accent"
              >
                <div className="flex gap-2 items-start mb-1">
                  <Avatar className="flex-shrink-0 w-5 h-5">
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 rounded-full" />
                  </Avatar>
                  <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                    <span>{item.time}</span>
                    <span>·</span>
                    <span>{item.category}</span>
                    <span>·</span>
                    <span>{item.posts} posts</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold leading-tight">
                  {item.title}
                </h3>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* What's happening */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-3">
            <h2 className="text-xl font-bold">What's happening</h2>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full"
            >
              <IconSearch className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {trendingItems.map((item, index) => (
              <button
                key={index}
                className="flex justify-between items-start py-3 px-4 w-full text-left transition-colors hover:bg-accent"
              >
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    {item.location}
                  </div>
                  <div className="font-semibold">{item.topic}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 w-8 h-8 rounded-full"
                >
                  <IconDotsCircleHorizontal className="w-4 h-4" />
                </Button>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IconDotsCircleHorizontal(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
