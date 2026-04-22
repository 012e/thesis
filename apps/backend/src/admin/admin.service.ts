import { Injectable, NotFoundException } from "@nestjs/common";
import { count, desc, eq } from "drizzle-orm";
import { DatabaseService } from "@/db/database.service";
import { user } from "@/db/auth-schema";
import type { AdminUserType } from "@repo/rest-contracts";

@Injectable()
export class AdminService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listUsers(opts: {
    limit?: number;
    offset?: number;
  }): Promise<{ users: AdminUserType[]; total: number }> {
    const db = this.databaseService.db;
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          banned: user.banned,
          banReason: user.banReason,
          createdAt: user.createdAt,
        })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(user),
    ]);

    return {
      users: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      total: Number(total),
    };
  }

  /**
   * Promote a user to the "admin" role.
   *
   * Throws NotFoundException if the user does not exist.
   * Better Auth reads the role from the DB on every request, so the change
   * takes effect immediately — no re-authentication required.
   */
  async promoteToAdmin(userId: string): Promise<void> {
    const db = this.databaseService.db;

    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId));

    if (!existing) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await db.update(user).set({ role: "admin" }).where(eq(user.id, userId));
  }
}
