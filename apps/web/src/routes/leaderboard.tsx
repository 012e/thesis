import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconTrophy } from "@tabler/icons-react";
import type { LeaderboardEntryDto } from "@repo/shared-dto";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { getLeaderboard } from "@/lib/api/users";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});

const LEADERBOARD_LIMIT = 50;

function LeaderboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", LEADERBOARD_LIMIT],
    queryFn: () => getLeaderboard({ limit: LEADERBOARD_LIMIT }),
  });

  const entries = data?.entries ?? [];

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md px-4 py-3">
        <h1 className="text-xl font-bold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          The community's highest-reputation members
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="w-6 h-6" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground select-none">
          <IconTrophy className="w-12 h-12 opacity-20" />
          <p className="text-lg font-medium">Failed to load leaderboard</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground select-none">
          <IconTrophy className="w-12 h-12 opacity-20" />
          <p className="text-lg font-medium">No ranked members yet</p>
          <p className="text-sm opacity-70">
            Earn reputation by posting and getting upvotes.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {entries.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </>
  );
}

/** Tailwind classes for the top three ranks; everyone else is muted. */
function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-yellow-400/20 text-yellow-600 dark:text-yellow-400";
  if (rank === 2) return "bg-zinc-400/20 text-zinc-600 dark:text-zinc-300";
  if (rank === 3) return "bg-amber-700/20 text-amber-700 dark:text-amber-500";
  return "text-muted-foreground";
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntryDto }) {
  const initials = entry.name
    ? entry.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (entry.displayUsername ?? entry.username ?? "U")
        .charAt(0)
        .toUpperCase();

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
          rankBadgeClass(entry.rank),
        )}
      >
        {entry.rank}
      </div>

      <Link
        to="/users/$userId"
        params={{ userId: entry.id }}
        className="shrink-0"
      >
        <Avatar className="w-11 h-11">
          <AvatarImage
            src={entry.image ?? undefined}
            alt={entry.name ?? entry.username ?? "User"}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>

      <Link
        to="/users/$userId"
        params={{ userId: entry.id }}
        className="flex-1 min-w-0"
      >
        <p className="font-semibold truncate leading-tight">
          {entry.name ?? entry.displayUsername ?? entry.username ?? "Unknown"}
        </p>
        {entry.displayUsername && (
          <p className="text-sm text-muted-foreground truncate">
            @{entry.displayUsername}
          </p>
        )}
      </Link>

      <div className="shrink-0 text-right">
        <p className="font-bold tabular-nums leading-tight">
          {entry.xp.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">XP</p>
      </div>
    </li>
  );
}
