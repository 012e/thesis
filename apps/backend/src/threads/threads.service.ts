import { Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { threads } from "@/db/schema";

@Injectable()
export class ThreadsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(userId: string) {
    const rows = await this.databaseService.db
      .select()
      .from(threads)
      .where(eq(threads.userId, userId))
      .orderBy(desc(threads.createdAt));
    return rows;
  }

  async create(userId: string, externalId?: string) {
    const [row] = await this.databaseService.db
      .insert(threads)
      .values({
        userId,
        externalId,
        title: "New Thread",
      })
      .returning();
    return row;
  }

  async getById(id: string, userId: string) {
    const [row] = await this.databaseService.db
      .select()
      .from(threads)
      .where(and(eq(threads.id, id), eq(threads.userId, userId)))
      .limit(1);
    return row || null;
  }

  async updateTitle(id: string, userId: string, title: string) {
    const [row] = await this.databaseService.db
      .update(threads)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(threads.id, id), eq(threads.userId, userId)))
      .returning();
    return row || null;
  }

  async archive(id: string, userId: string) {
    const [row] = await this.databaseService.db
      .update(threads)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(threads.id, id), eq(threads.userId, userId)))
      .returning();
    return row || null;
  }

  async unarchive(id: string, userId: string) {
    const [row] = await this.databaseService.db
      .update(threads)
      .set({ isArchived: false, updatedAt: new Date() })
      .where(and(eq(threads.id, id), eq(threads.userId, userId)))
      .returning();
    return row || null;
  }

  async delete(id: string, userId: string) {
    const [row] = await this.databaseService.db
      .delete(threads)
      .where(and(eq(threads.id, id), eq(threads.userId, userId)))
      .returning();
    return row || null;
  }
}
