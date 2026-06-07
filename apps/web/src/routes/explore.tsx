import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  useRef,
  useState,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast as toast } from "@/hooks/use-toast";
import {
  IconSearch,
  IconUserPlus,
  IconUserMinus,
  IconX,
  IconHash,
  IconStar,
  IconBan,
} from "@tabler/icons-react";

import { Post } from "@/components/post";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useSearchPosts, useSearchUsers } from "@/hooks/use-search";
import { useSession } from "@/hooks/use-session";
import { useTagSuggestions } from "@/hooks/use-tag-suggestions";
import {
  useSetTagPreference,
  useTagPreferences,
} from "@/hooks/use-tag-preferences";
import { SEARCH_USERS_QUERY_KEY } from "@/hooks/use-search";
import { client } from "@/lib/api";
import { handleAuthFailure } from "@/lib/auth";
import type { UserSearchResultType } from "@repo/rest-contracts";

// ─── Route definition ────────────────────────────────────────────────────────

const exploreSearchSchema = z.object({
  q: z.string().optional(),
  tab: z.enum(["posts", "people", "tags"]).optional(),
});

export const Route = createFileRoute("/explore")({
  validateSearch: exploreSearchSchema,
  component: ExplorePage,
});

// ─── Follow/unfollow mutation ────────────────────────────────────────────────

function useFollowToggle(q: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      isFollowing,
    }: {
      userId: string;
      isFollowing: boolean;
    }) => {
      if (isFollowing) {
        const res = await client.unfollowUser({
          params: { id: userId },
        });
        if (res.status === 401) {
          handleAuthFailure();
          throw new Error("Authentication required");
        }
        if (res.status !== 200) throw new Error("Failed to unfollow");
      } else {
        const res = await client.followUser({
          params: { id: userId },
        });
        if (res.status === 401) {
          handleAuthFailure();
          throw new Error("Authentication required");
        }
        if (res.status !== 201) throw new Error("Failed to follow");
      }
    },
    onSuccess: (_data, { isFollowing }) => {
      toast.success(isFollowing ? "Unfollowed" : "Following");
      queryClient.invalidateQueries({ queryKey: SEARCH_USERS_QUERY_KEY(q) });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── User result card ─────────────────────────────────────────────────────────

interface UserCardProps {
  user: UserSearchResultType & { isFollowing?: boolean };
  currentUserId: string | undefined;
  onFollowToggle: (userId: string, isFollowing: boolean) => void;
  isPending: boolean;
}

function UserCard({
  user,
  currentUserId,
  onFollowToggle,
  isPending,
}: UserCardProps) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.displayUsername ?? user.username ?? "U").charAt(0).toUpperCase();

  const isOwnProfile = currentUserId === user.id;

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
      <Link
        to="/users/$userId"
        params={{ userId: user.id }}
        className="shrink-0"
      >
        <Avatar className="w-11 h-11">
          <AvatarImage
            src={user.image ?? undefined}
            alt={user.name ?? user.username ?? "User"}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>

      <Link
        to="/users/$userId"
        params={{ userId: user.id }}
        className="flex-1 min-w-0"
      >
        <p className="font-semibold truncate leading-tight">
          {user.name ?? user.displayUsername ?? user.username ?? "Unknown"}
        </p>
        {user.displayUsername && (
          <p className="text-sm text-muted-foreground truncate">
            @{user.displayUsername}
          </p>
        )}
      </Link>

      {!isOwnProfile && (
        <Button
          variant={user.isFollowing ? "outline" : "default"}
          size="sm"
          className="shrink-0 rounded-full"
          disabled={isPending}
          onClick={() => onFollowToggle(user.id, user.isFollowing ?? false)}
        >
          {user.isFollowing ? (
            <>
              <IconUserMinus className="w-4 h-4 mr-1.5" />
              Unfollow
            </>
          ) : (
            <>
              <IconUserPlus className="w-4 h-4 mr-1.5" />
              Follow
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ─── People tab ──────────────────────────────────────────────────────────────

function PeopleResults({ q }: { q: string }) {
  const { data: session } = useSession();
  const { data: users, isLoading, isError, error } = useSearchUsers(q);
  const followToggle = useFollowToggle(q);

  // Local optimistic follow state — track toggled users since UserSearchResult
  // doesn't include isFollowing; we seed it as false and flip on toggle.
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [unfollowedIds, setUnfollowedIds] = useState<Set<string>>(new Set());

  function handleToggle(userId: string, currentlyFollowing: boolean) {
    followToggle.mutate(
      { userId, isFollowing: currentlyFollowing },
      {
        onSuccess: () => {
          if (currentlyFollowing) {
            setFollowedIds((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
            setUnfollowedIds((prev) => new Set(prev).add(userId));
          } else {
            setUnfollowedIds((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
            setFollowedIds((prev) => new Set(prev).add(userId));
          }
        },
      },
    );
  }

  // Reset optimistic state when query changes
  useEffect(() => {
    setFollowedIds(new Set());
    setUnfollowedIds(new Set());
  }, [q]);

  if (!q.trim()) return null;

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner className="w-6 h-6" />
      </div>
    );

  if (isError)
    return (
      <div className="p-8 text-center text-destructive">
        Error: {error?.message}
      </div>
    );

  if (!users || users.length === 0)
    return (
      <div className="p-12 text-center text-muted-foreground">
        No people found for &ldquo;{q}&rdquo;
      </div>
    );

  return (
    <div className="divide-y">
      {users.map((user) => {
        const isFollowing = followedIds.has(user.id)
          ? true
          : unfollowedIds.has(user.id)
            ? false
            : false;

        return (
          <UserCard
            key={user.id}
            user={{ ...user, isFollowing }}
            currentUserId={session?.user?.id}
            onFollowToggle={handleToggle}
            isPending={
              followToggle.isPending &&
              followToggle.variables?.userId === user.id
            }
          />
        );
      })}
    </div>
  );
}

// ─── Posts tab ───────────────────────────────────────────────────────────────

function PostsResults({ q }: { q: string }) {
  const { data: posts, isLoading, isError, error } = useSearchPosts(q);

  if (!q.trim()) return null;

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner className="w-6 h-6" />
      </div>
    );

  if (isError)
    return (
      <div className="p-8 text-center text-destructive">
        Error: {error?.message}
      </div>
    );

  if (!posts || posts.length === 0)
    return (
      <div className="p-12 text-center text-muted-foreground">
        No posts found for &ldquo;{q}&rdquo;
      </div>
    );

  return (
    <div className="divide-y">
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  );
}

// ─── Tags tab ────────────────────────────────────────────────────────────────

function TagsResults({ q }: { q: string }) {
  const normalizedQuery = q.replace(/^#/, "");
  const { data, isLoading, isError, error } = useTagSuggestions(
    normalizedQuery,
    12,
  );
  const preferences = useTagPreferences();
  const setPreference = useSetTagPreference();

  const currentPreferenceBySlug = new Map<string, "preferred" | "blocked">();
  for (const tag of preferences.data?.preferred ?? []) {
    currentPreferenceBySlug.set(tag.slug, "preferred");
  }
  for (const tag of preferences.data?.blocked ?? []) {
    currentPreferenceBySlug.set(tag.slug, "blocked");
  }

  if (!q.trim()) return null;

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner className="w-6 h-6" />
      </div>
    );

  if (isError)
    return (
      <div className="p-8 text-center text-destructive">
        Error: {error?.message}
      </div>
    );

  if (!data || data.items.length === 0)
    return (
      <div className="p-12 text-center text-muted-foreground">
        No tags found for &ldquo;{q}&rdquo;
      </div>
    );

  return (
    <div className="divide-y">
      {data.items.map((tag) => {
        const currentPreference = currentPreferenceBySlug.get(tag.slug);
        const isPending =
          setPreference.isPending && setPreference.variables?.slug === tag.slug;

        return (
          <div
            key={tag.slug}
            className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-accent sm:flex-row sm:items-center"
          >
            <Link
              to="/tags/$slug"
              params={{ slug: tag.slug }}
              className="flex min-w-0 flex-1 items-start gap-3"
            >
              <IconHash className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">
                  #{tag.displayName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tag.postCount} {tag.postCount === 1 ? "post" : "posts"}
                  {currentPreference ? ` · ${currentPreference}` : ""}
                </p>
              </div>
            </Link>
            <div className="flex gap-2 pl-8 sm:pl-0">
              <Button
                type="button"
                size="sm"
                variant={currentPreference === "preferred" ? "default" : "outline"}
                disabled={isPending}
                onClick={() =>
                  setPreference.mutate({ slug: tag.slug, preference: "preferred" })
                }
              >
                <IconStar className="size-4" />
                Prefer
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  currentPreference === "blocked" ? "destructive" : "outline"
                }
                disabled={isPending}
                onClick={() =>
                  setPreference.mutate({ slug: tag.slug, preference: "blocked" })
                }
              >
                <IconBan className="size-4" />
                Block
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Exported content component (used by Storybook) ──────────────────────────

interface ExploreSearchHeaderProps {
  q: string;
  onSearch: (q: string) => void;
}

function ExploreSearchHeader({ q, onSearch }: ExploreSearchHeaderProps) {
  const [inputValue, setInputValue] = useState(q);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input when prop changes externally
  useEffect(() => {
    setInputValue(q);
  }, [q]);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSearch(inputValue.trim());
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch(inputValue.trim());
  }

  function clearSearch() {
    setInputValue("");
    onSearch("");
    inputRef.current?.focus();
  }

  return (
    <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
      <form onSubmit={handleFormSubmit} className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search posts and people..."
          className="px-15 py-7 h-11 bg-muted border-0 focus-visible:ring-1"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <IconX className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
}

export interface ExplorePageContentProps {
  /** Active query string. Empty string = show the empty prompt. */
  q: string;
  /** Active tab. */
  tab: "posts" | "people" | "tags";
  /** Called when the user submits a new search query. */
  onSearch: (q: string) => void;
  /** Called when the user switches tabs. */
  onTabChange: (tab: "posts" | "people" | "tags") => void;
}

export function ExplorePageContent({
  q,
  tab,
  onSearch,
  onTabChange,
}: ExplorePageContentProps) {
  const activeQ = q.trim();

  return (
    <>
      {/* Sticky header: search bar */}
      <ExploreSearchHeader q={q} onSearch={onSearch} />

      {/* Tab bar — only visible when there's a query */}
      {activeQ && (
        <div className="sticky top-14 z-10 flex border-b bg-background/80 backdrop-blur-md">
          <button
            type="button"
            onClick={() => onTabChange("posts")}
            className={`flex-1 py-4 text-center font-semibold text-sm transition-colors hover:bg-accent relative ${
              tab === "posts"
                ? "font-bold text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Posts
            {tab === "posts" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-16 rounded-t-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onTabChange("people")}
            className={`flex-1 py-4 text-center font-semibold text-sm transition-colors hover:bg-accent relative ${
              tab === "people"
                ? "font-bold text-foreground"
                : "text-muted-foreground"
            }`}
          >
            People
            {tab === "people" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-16 rounded-t-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onTabChange("tags")}
            className={`flex-1 py-4 text-center font-semibold text-sm transition-colors hover:bg-accent relative ${
              tab === "tags"
                ? "font-bold text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Tags
            {tab === "tags" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-16 rounded-t-full bg-primary" />
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {!activeQ ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground select-none">
          <IconSearch className="w-12 h-12 opacity-20" />
          <p className="text-lg font-medium">Search posts, people, and tags</p>
          <p className="text-sm opacity-70">
            Try searching for a topic, username, or keyword
          </p>
        </div>
      ) : tab === "posts" ? (
        <PostsResults q={activeQ} />
      ) : tab === "people" ? (
        <PeopleResults q={activeQ} />
      ) : (
        <TagsResults q={activeQ} />
      )}
    </>
  );
}

// ─── Route-connected wrapper ──────────────────────────────────────────────────

type ExploreSearch = { q?: string; tab?: "posts" | "people" | "tags" };

function ExplorePage() {
  const { q = "", tab = "posts" } = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });

  function handleSearch(newQ: string) {
    // Detect #tag queries and route to tag page
    const tagMatch = newQ.match(/^#([A-Za-z]\w{0,49})$/);
    if (tagMatch) {
      const slug = tagMatch[1].toLowerCase();
      void navigate({ to: "/tags/$slug", params: { slug } });
      return;
    }
    void navigate({
      search: (prev: ExploreSearch) => ({ ...prev, q: newQ || undefined }),
    });
  }

  function handleTabChange(newTab: "posts" | "people" | "tags") {
    void navigate({
      search: (prev: ExploreSearch) => ({ ...prev, tab: newTab }),
    });
  }

  return (
    <ExplorePageContent
      q={q}
      tab={tab}
      onSearch={handleSearch}
      onTabChange={handleTabChange}
    />
  );
}
