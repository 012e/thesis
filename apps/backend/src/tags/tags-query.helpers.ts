import { sql, type SQLWrapper } from "drizzle-orm";

import { postTags, userTagPreferences } from "@/db/schema";

export function excludesBlockedTags(userId: string, postId: SQLWrapper) {
  return sql<boolean>`NOT EXISTS (
    SELECT 1 FROM ${postTags}
    INNER JOIN ${userTagPreferences}
      ON ${userTagPreferences.tagId} = ${postTags.tagId}
    WHERE ${postTags.postId} = ${postId}
      AND ${userTagPreferences.userId} = ${userId}
      AND ${userTagPreferences.preference} = 'blocked'
  )`;
}
