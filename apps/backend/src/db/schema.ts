import type { PostContentDto } from '@repo/shared-dto';
import { sql } from 'drizzle-orm';
import {
  jsonb,
  pgEnum,
  pgTable,
  pgView,
  primaryKey,
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

export const reactionTypeEnum = pgEnum('reaction_type', ['upvote', 'downvote']);

export const postReactions = pgTable(
  'post_reactions',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    type: reactionTypeEnum('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export type PostReaction = typeof postReactions.$inferSelect;
export type NewPostReaction = typeof postReactions.$inferInsert;
