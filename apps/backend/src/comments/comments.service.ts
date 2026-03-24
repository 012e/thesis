import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/db/database.service';
import { comments, usersView } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

@Injectable()
export class CommentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(postId: string) {
    const rows = await this.databaseService.db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
        },
      })
      .from(comments)
      .innerJoin(usersView, eq(comments.authorId, usersView.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));

    return rows.map(this.toDto);
  }

  async create(
    authorId: string,
    postId: string,
    content: string,
    parentId?: string,
  ) {
    const [createdComment] = await this.databaseService.db
      .insert(comments)
      .values({
        authorId,
        postId,
        content,
        parentId,
      })
      .returning();

    const [row] = await this.databaseService.db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
        },
      })
      .from(comments)
      .innerJoin(usersView, eq(comments.authorId, usersView.id))
      .where(eq(comments.id, createdComment.id))
      .limit(1);

    return this.toDto(row);
  }

  async getById(id: string) {
    const [row] = await this.databaseService.db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
        },
      })
      .from(comments)
      .innerJoin(usersView, eq(comments.authorId, usersView.id))
      .where(eq(comments.id, id))
      .limit(1);

    return row ? this.toDto(row) : null;
  }

  async delete(id: string) {
    const [row] = await this.databaseService.db
      .delete(comments)
      .where(eq(comments.id, id))
      .returning();

    return row;
  }

  async listReplies(commentId: string) {
    const rows = await this.databaseService.db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
        },
      })
      .from(comments)
      .innerJoin(usersView, eq(comments.authorId, usersView.id))
      .where(eq(comments.parentId, commentId))
      .orderBy(desc(comments.createdAt));

    return rows.map(this.toDto);
  }

  private toDto(row: any) {
    return {
      id: row.id,
      postId: row.postId,
      parentId: row.parentId ?? null,
      authorId: row.authorId,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      author: {
        id: row.author.id,
        username: row.author.username ?? null,
        email: row.author.email,
        name: row.author.name ?? null,
      },
    };
  }
}
