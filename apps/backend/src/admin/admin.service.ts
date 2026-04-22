import { Injectable } from "@nestjs/common";
import { count, desc } from "drizzle-orm";
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
}
