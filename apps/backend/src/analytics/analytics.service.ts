import { Injectable } from "@nestjs/common";
import { eq, and, desc, count, sql } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { analyticsEvents } from "@/db/schema";

export interface IngestEventInput {
  userId: string;
  type: string;
  metadata?: Record<string, unknown> | null;
  clientTimestamp: Date;
}

export interface AnalyticsEventDto {
  id: string;
  userId: string;
  type: string;
  metadata: Record<string, unknown> | null;
  clientTimestamp: string;
  createdAt: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Ingest a batch of analytics events for a user.
   * Returns the number of events successfully ingested.
   */
  async ingestBatch(events: IngestEventInput[]): Promise<number> {
    if (events.length === 0) return 0;

    const values = events.map((e) => ({
      userId: e.userId,
      type: e.type as typeof analyticsEvents.$inferInsert.type,
      metadata: e.metadata ?? null,
      clientTimestamp: e.clientTimestamp,
    }));

    const rows = await this.databaseService.db
      .insert(analyticsEvents)
      .values(values)
      .returning({ id: analyticsEvents.id });

    return rows.length;
  }

  /**
   * Get paginated analytics events for a specific user,
   * optionally filtered by event type.
   */
  async getEventsByUser(
    userId: string,
    options: { limit?: number; offset?: number; type?: string } = {},
  ): Promise<{ items: AnalyticsEventDto[]; total: number }> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const conditions = [eq(analyticsEvents.userId, userId)];
    if (options.type) {
      conditions.push(
        eq(
          analyticsEvents.type,
          options.type as typeof analyticsEvents.$inferInsert.type,
        ),
      );
    }

    const whereClause = and(...conditions);

    const [totalRow] = await this.databaseService.db
      .select({ cnt: count() })
      .from(analyticsEvents)
      .where(whereClause);

    const rows = await this.databaseService.db
      .select()
      .from(analyticsEvents)
      .where(whereClause)
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((r) => this.toDto(r)),
      total: totalRow?.cnt ?? 0,
    };
  }

  private toDto(
    row: typeof analyticsEvents.$inferSelect,
  ): AnalyticsEventDto {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      metadata: row.metadata,
      clientTimestamp: row.clientTimestamp.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
