import { and, desc, eq } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import type { PostDto } from '@repo/shared-dto';
import type { z } from 'zod';

import { DatabaseService } from '@/db/database.service';
import { posts } from '@/db/schema';

import { createPostSchema, updatePostSchema } from './posts.schemas';

type CreatePostInput = z.infer<typeof createPostSchema>;
type UpdatePostInput = z.infer<typeof updatePostSchema>;

@Injectable()
export class PostsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<PostDto[]> {
    const rows = await this.databaseService.db
      .select()
      .from(posts)
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

    return this.toDto(createdPost);
  }

  async getById(id: string): Promise<PostDto | null> {
    const [post] = await this.databaseService.db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    return post ? this.toDto(post) : null;
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

    return updatedPost ? this.toDto(updatedPost) : null;
  }

  async delete(id: string, authorId: string): Promise<PostDto | null> {
    const [deletedPost] = await this.databaseService.db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)))
      .returning();

    return deletedPost ? this.toDto(deletedPost) : null;
  }

  private readonly toDto = (post: typeof posts.$inferSelect): PostDto => {
    return {
      id: post.id,
      authorId: post.authorId,
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  };
}
