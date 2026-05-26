import { count, sql } from "drizzle-orm";

import {
  comments,
  postBookmarks,
  postReactions,
  posts,
  postSubscriptions,
} from "@/db/schema";

export const upvoteCount = count(
  sql`CASE WHEN ${postReactions.type} = 'upvote' THEN 1 END`,
).as("upvoteCount");

export const downvoteCount = count(
  sql`CASE WHEN ${postReactions.type} = 'downvote' THEN 1 END`,
).as("downvoteCount");

export const commentCount =
  sql<number>`(SELECT count(*)::int FROM ${comments} WHERE ${comments.postId} = ${posts.id})`.as(
    "commentCount",
  );

export const getUserReactionType = (userId: string) => {
  return sql<
    string | null
  >`MAX(CASE WHEN ${postReactions.userId} = ${sql.raw(`'${userId}'`)} THEN ${postReactions.type} END)`;
};

export const getCurrentUserSubscribed = (userId: string) => {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${postSubscriptions}
    WHERE ${postSubscriptions.postId} = ${posts.id}
      AND ${postSubscriptions.userId} = ${userId}
  )`;
};

export const getCurrentUserBookmarked = (userId: string) => {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${postBookmarks}
    WHERE ${postBookmarks.postId} = ${posts.id}
      AND ${postBookmarks.userId} = ${userId}
  )`;
};
