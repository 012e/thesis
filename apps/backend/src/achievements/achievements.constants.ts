import type { AchievementTierDto } from "@repo/shared-dto";

/**
 * XP-milestone achievement tiers, ascending by threshold. The single source of
 * truth for tier names and the XP required to unlock them — kept here as a
 * product knob so the ladder can be re-balanced without touching call sites.
 */
export const ACHIEVEMENT_TIERS: ReadonlyArray<{
  tier: AchievementTierDto;
  label: string;
  threshold: number;
}> = [
  { tier: "bronze", label: "Bronze", threshold: 100 },
  { tier: "silver", label: "Silver", threshold: 500 },
  { tier: "gold", label: "Gold", threshold: 1000 },
  { tier: "platinum", label: "Platinum", threshold: 5000 },
];
