import { and, desc, eq } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import type { PostDto } from '@repo/shared-dto';
import type { z } from 'zod';

import { DatabaseService } from '@/db/database.service';
import { posts, usersView } from '@/db/schema';

import { createPostSchema, updatePostSchema } from './posts.schemas';

type CreatePostInput = z.infer<typeof createPostSchema>;
type UpdatePostInput = z.infer<typeof updatePostSchema>;

type PostRow = typeof posts.$inferSelect & {
  author: typeof usersView.$inferSelect;
};

@Injectable()
export class PostsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<PostDto[]> {
    const rows = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
        },
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .orderBy(desc(posts.createdAt));

    return rows.map(this.toDto);
  }

  async create(authorId: string, input: CreatePostInput): Promise<PostDto> {
    const [createdPost] = await this.databaseService.db
      .insert(posts)
      .values({
        authorId,
        content: input.content,
      })
      .returning();

    const [row] = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
        },
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .where(eq(posts.id, createdPost.id))
      .limit(1);

    return this.toDto(row);
  }

  async getById(id: string): Promise<PostDto | null> {
    const [row] = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
        },
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .where(eq(posts.id, id))
      .limit(1);

    return row ? this.toDto(row) : null;
  }

  async update(
    id: string,
    authorId: string,
    input: UpdatePostInput,
  ): Promise<PostDto | null> {
    const [updatedPost] = await this.databaseService.db
      .update(posts)
      .set({
        content: input.content,
        updatedAt: new Date(),
      })
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)))
      .returning();

    if (!updatedPost) return null;

    const [row] = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
        },
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .where(eq(posts.id, updatedPost.id))
      .limit(1);

    return row ? this.toDto(row) : null;
  }

  async delete(id: string, authorId: string): Promise<PostDto | null> {
    const [row] = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
        },
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .where(eq(posts.id, id))
      .limit(1);

    if (!row || row.authorId !== authorId) return null;

    await this.databaseService.db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)));

    return this.toDto(row);
  }

  private readonly toDto = (row: PostRow): PostDto => {
    return {
      id: row.id,
      authorId: row.authorId,
      author: {
        id: row.author.id,
        username: row.author.username ?? null,
        email: row.author.email,
        name: row.author.name ?? null,
      },
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  };
}
