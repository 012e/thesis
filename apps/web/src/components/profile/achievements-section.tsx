import { IconLock, IconTrophy } from "@tabler/icons-react";
import type { AchievementDto, AchievementTierDto } from "@repo/shared-dto";

import { cn } from "@/lib/utils";
import { useUserAchievements } from "@/hooks/use-user-achievements";

/** Per-tier accent colors, applied only once a tier is unlocked. */
const TIER_COLORS: Record<AchievementTierDto, string> = {
  bronze: "text-amber-700 dark:text-amber-600",
  silver: "text-slate-500 dark:text-slate-300",
  gold: "text-yellow-600 dark:text-yellow-400",
  platinum: "text-cyan-600 dark:text-cyan-400",
};

interface AchievementsSectionProps {
  userId: string;
}

/**
 * The user's XP-milestone achievement board: every tier rendered as a compact
 * cell, unlocked tiers highlighted with their accent color, locked tiers muted
 * with the XP still required.
 */
export function AchievementsSection({ userId }: AchievementsSectionProps) {
  const { data: achievements, isLoading, isError } = useUserAchievements(userId);

  if (isLoading || isError || !achievements) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="px-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Achievements</h2>
        <span className="text-sm text-muted-foreground">
          {unlockedCount}/{achievements.length} unlocked
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.tier} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementDto }) {
  const { tier, label, threshold, unlocked } = achievement;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 border p-3 text-center transition-colors",
        unlocked ? "bg-accent/30" : "opacity-60",
      )}
      title={
        unlocked
          ? `${label} — unlocked at ${threshold.toLocaleString()} XP`
          : `${label} — reach ${threshold.toLocaleString()} XP to unlock`
      }
    >
      {unlocked ? (
        <IconTrophy className={cn("size-7", TIER_COLORS[tier])} />
      ) : (
        <IconLock className="size-7 text-muted-foreground" />
      )}
      <span className="text-sm font-bold">{label}</span>
      <span className="text-xs text-muted-foreground">
        {threshold.toLocaleString()} XP
      </span>
    </div>
  );
}
