import { Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { countTokens } from "gpt-tokenizer";
import type { AITokenUsageDto } from "@repo/shared-dto";

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

  async getMessages(
    id: string,
    userId: string,
  ): Promise<{ headId: string | null; messages: unknown[] } | null> {
    const thread = await this.getById(id, userId);
    if (!thread) return null;
    const messages = (thread.messages ?? []) as unknown[];
    const lastEntry = messages.at(-1) as { id?: string } | undefined;
    const headId = lastEntry?.id ?? null;
    return { headId, messages };
  }

  async getTokenUsage(id: string, userId: string): Promise<AITokenUsageDto | null> {
    const thread = await this.getById(id, userId);
    if (!thread) return null;

    const messages = (thread.messages ?? []) as unknown[];
    return messages.reduce<AITokenUsageDto>(
      (total, message) => {
        const tokenCount = countTokens(extractVisibleMessageText(message));
        const role = getMessageRole(message);
        const isAssistant = role === "assistant";

        return {
          inputTokens: total.inputTokens + (isAssistant ? 0 : tokenCount),
          outputTokens: total.outputTokens + (isAssistant ? tokenCount : 0),
          totalTokens: total.totalTokens + tokenCount,
          messageCount: total.messageCount + 1,
        };
      },
      { inputTokens: 0, outputTokens: 0, totalTokens: 0, messageCount: 0 },
    );
  }

  async appendMessage(
    id: string,
    userId: string,
    entry: unknown,
  ): Promise<boolean> {
    const thread = await this.getById(id, userId);
    if (!thread) return false;
    const updated = [...((thread.messages ?? []) as unknown[]), entry];
    await this.databaseService.db
      .update(threads)
      .set({ messages: updated, updatedAt: new Date() })
      .where(and(eq(threads.id, id), eq(threads.userId, userId)));
    return true;
  }
}

function getMessageRole(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  if (typeof value.role === "string") return value.role;

  const content = value.content;
  if (isRecord(content) && typeof content.role === "string") {
    return content.role;
  }

  return undefined;
}

function extractVisibleMessageText(value: unknown): string {
  const content = isRecord(value) && "content" in value ? value.content : value;
  return extractText(content);
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join("\n");
  }

  if (!isRecord(value)) return "";

  if (typeof value.text === "string") return value.text;

  const nestedText = [value.content, value.parts, value.message, value.value]
    .map(extractText)
    .filter(Boolean);

  return nestedText.join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
