import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { searchUsers } from "@/lib/api/search";
import { listFollowing, followUser } from "@/lib/api/follows";
import type { UserSearchResultDto } from "@repo/shared-dto";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { IconUserPlus, IconCheck } from "@tabler/icons-react";

interface WhoToFollowProps {
  currentUserId: string;
}

export function WhoToFollow({ currentUserId }: WhoToFollowProps) {
  const [users, setUsers] = useState<UserSearchResultDto[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [allUsers, following] = await Promise.all([
          searchUsers({ limit: 100 }),
          listFollowing(currentUserId),
        ]);
        
        const followingSet = new Set(following.map((u) => u.id));
        setFollowingIds(followingSet);
        
        const notFollowing = allUsers.users.filter((u) => u.id !== currentUserId && !followingSet.has(u.id));
        setUsers(notFollowing.slice(0, 5));
      } catch (error) {
        console.error("Failed to load who to follow:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentUserId]);

  async function handleFollow(userId: string) {
    setFollowingInProgress((prev) => new Set(prev).add(userId));
    try {
      await followUser(userId);
      setFollowingIds((prev) => new Set(prev).add(userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      console.error("Failed to follow user:", error);
    } finally {
      setFollowingInProgress((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-xl font-bold">Who to follow</h2>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-xl font-bold">Who to follow</h2>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No suggestions available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="text-xl font-bold">Who to follow</h2>
      </CardHeader>
      <CardContent className="p-0">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between py-3 px-4 w-full text-left transition-colors hover:bg-accent"
          >
            <button
              className="flex items-center gap-3 flex-1 min-w-0"
              onClick={() => navigate({ to: "/users/$userId", params: { userId: user.id } })}
            >
              <Avatar className="w-10 h-10 shrink-0">
                {user.image ? (
                  <img src={user.image} alt={user.name ?? user.username ?? undefined} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                    {(user.name?.[0] || user.username?.[0] || "?").toUpperCase()}
                  </div>
                )}
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold truncate">{user.name || user.username}</span>
                <span className="text-sm text-muted-foreground truncate">@{user.displayUsername || user.username}</span>
              </div>
            </button>
            <Button
              size="sm"
              variant={followingIds.has(user.id) ? "outline" : "default"}
              className="shrink-0 ml-2 rounded-full px-3"
              onClick={(e) => {
                e.stopPropagation();
                handleFollow(user.id);
              }}
              disabled={followingInProgress.has(user.id)}
            >
              {followingInProgress.has(user.id) ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : followingIds.has(user.id) ? (
                <>
                  <IconCheck className="w-4 h-4 mr-1" />
                  Following
                </>
              ) : (
                <>
                  <IconUserPlus className="w-4 h-4 mr-1" />
                  Follow
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
