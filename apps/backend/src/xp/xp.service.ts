import { Injectable, Logger } from "@nestjs/common";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { AchievementsService } from "@/achievements/achievements.service";
import { DatabaseService } from "@/db/database.service";
import { userXp, xpLedger } from "@/db/schema";
import { XP_DAILY_VOTE_CAP, XP_VOTE_REASONS } from "./xp.constants";

type XpReason = (typeof xpLedger.$inferInsert)["reason"];

export interface AwardXpParams {
  /** The user who earns the XP. */
  userId: string;
  /** Who triggered the event (voter, or asker accepting an answer). */
  actorId: string;
  reason: XpReason;
  /** Post or comment the award is attributed to. */
  sourceId: string;
  amount: number;
}

export interface RevokeXpParams {
  reason: XpReason;
  sourceId: string;
  actorId: string;
}

/**
 * Owns the reputation ledger. All earning flows funnel through `award`/`revoke`
 * so the guard rules (no self-voting, idempotency, daily caps) live in one place
 * and `user_xp` stays consistent with `xp_ledger`.
 */
@Injectable()
export class XpService {
  private readonly logger = new Logger(XpService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly achievementsService: AchievementsService,
  ) {}

  /**
   * Grant XP for an event. Returns the amount actually awarded — 0 when the
   * award was skipped (self-vote, already awarded, or the daily cap was hit) so
   * callers can decide whether to surface a "+N XP" toast.
   */
  async award(params: AwardXpParams): Promise<number> {
    const { userId, actorId, reason, sourceId, amount } = params;

    // You can't earn reputation from yourself.
    if (userId === actorId) return 0;
    if (amount <= 0) return 0;

    if (this.isVoteReason(reason)) {
      const earnedToday = await this.voteXpEarnedToday(userId);
      if (earnedToday >= XP_DAILY_VOTE_CAP) return 0;
    }

    const awarded = await this.databaseService.db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(xpLedger)
        .values({ userId, actorId, reason, sourceId, amount })
        .onConflictDoNothing({
          target: [xpLedger.reason, xpLedger.sourceId, xpLedger.actorId],
        })
        .returning();

      // Conflict → this exact award already exists; don't double-count.
      if (!entry) return 0;

      await tx
        .insert(userXp)
        .values({ userId, total: amount })
        .onConflictDoUpdate({
          target: userXp.userId,
          set: {
            total: sql`${userXp.total} + ${amount}`,
            updatedAt: sql`now()`,
          },
        });

      return amount;
    });

    // The new total may have crossed an achievement threshold. Unlock + notify
    // out of band so a slow notification never blocks the earning flow.
    if (awarded > 0) {
      void this.achievementsService.syncAndNotify(userId).catch((err) => {
        this.logger.warn(
          `Failed to sync achievements for ${userId}: ${(err as Error)?.message ?? err}`,
        );
      });
    }

    return awarded;
  }

  /**
   * Undo an award when its triggering action is reversed (downvote, un-react,
   * re-opening a question). No-op when there is nothing to revoke.
   */
  async revoke(params: RevokeXpParams): Promise<void> {
    const { reason, sourceId, actorId } = params;

    await this.databaseService.db.transaction(async (tx) => {
      const [removed] = await tx
        .delete(xpLedger)
        .where(
          and(
            eq(xpLedger.reason, reason),
            eq(xpLedger.sourceId, sourceId),
            eq(xpLedger.actorId, actorId),
          ),
        )
        .returning();

      if (!removed) return;

      await tx
        .update(userXp)
        .set({
          total: sql`GREATEST(0, ${userXp.total} - ${removed.amount})`,
          updatedAt: sql`now()`,
        })
        .where(eq(userXp.userId, removed.userId));
    });
  }

  private isVoteReason(reason: XpReason): boolean {
    return (XP_VOTE_REASONS as readonly string[]).includes(reason);
  }

  private async voteXpEarnedToday(userId: string): Promise<number> {
    const [row] = await this.databaseService.db
      .select({ total: sql<number>`COALESCE(SUM(${xpLedger.amount}), 0)::int` })
      .from(xpLedger)
      .where(
        and(
          eq(xpLedger.userId, userId),
          inArray(xpLedger.reason, [...XP_VOTE_REASONS]),
          gte(xpLedger.createdAt, this.startOfToday()),
        ),
      );

    return row?.total ?? 0;
  }

  private startOfToday(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
