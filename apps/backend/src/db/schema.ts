import type { PostContentDto } from '@repo/shared-dto';
import { sql } from 'drizzle-orm';
import {
  jsonb,
  pgTable,
  pgView,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: text('author_id').notNull(),
  content: jsonb('content').$type<PostContentDto>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

/**
 * A read-only view over the better-auth `user` table.
 * Exposes only the fields needed by the posts feature.
 * The underlying table is managed by better-auth migrations.
 */
export const usersView = pgView('users_view', {
  id: text('id').notNull(),
  username: text('username'),
  email: text('email').notNull(),
  name: text('name'),
}).as(sql`SELECT id, username, email, name FROM "user"`);

export type UserView = typeof usersView.$inferSelect;
