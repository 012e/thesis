import { Injectable } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '@/db/database.service';
import { user } from '@/db/auth-schema';
import { userFollows, posts } from '@/db/schema';
import type { UserProfileDto, UserSearchResultDto } from '@repo/shared-dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async search(query: string): Promise<UserSearchResultDto[]> {
    // ParadeDB's @@@ operator cannot be used inside queries that also have JOINs
    // because the BM25 scan context does not propagate through join planner nodes.
    // Solution: run a standalone BM25 search first (with score) in a CTE, then
    // JOIN back to "user" on the resulting IDs in the outer query.
    //
    // paradedb.boolean(should => ARRAY[...]) performs an OR across the three
    // indexed text fields (name, email, username). NULL usernames are simply
    // absent from the index and will never produce a false match.
    const result = await this.databaseService.db.execute(sql`
      WITH bm25 AS (
        SELECT id, paradedb.score(id) AS bm25_score
        FROM "user"
        WHERE id @@@ paradedb.boolean(
          should => ARRAY[
            paradedb.match('name', ${query}),
            paradedb.match('email', ${query}),
            paradedb.match('username', ${query})
          ]
        )
        LIMIT 20
      )
      SELECT
        u.id,
        u.username,
        u.display_username,
        u.name,
        u.image,
        bm25.bm25_score
      FROM bm25
      JOIN "user" u ON u.id = bm25.id
      ORDER BY bm25.bm25_score DESC
    `);

    return result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r['id'] as string,
        username: (r['username'] as string | null) ?? null,
        displayUsername: (r['display_username'] as string | null) ?? null,
        name: (r['name'] as string | null) ?? null,
        image: (r['image'] as string | null) ?? null,
      } satisfies UserSearchResultDto;
    });
  }

  async getProfile(
    userId: string,
    currentUserId: string,
  ): Promise<UserProfileDto | null> {
    const followersCountSq = this.databaseService.db
      .select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followeeId, userId));

    const followingCountSq = this.databaseService.db
      .select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));

    const postCountSq = this.databaseService.db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.authorId, userId));

    const isFollowingSq = this.databaseService.db
      .select({ count: count() })
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, currentUserId),
          eq(userFollows.followeeId, userId),
        ),
      );

    const [row] = await this.databaseService.db
      .select({
        id: user.id,
        username: user.username,
        displayUsername: user.displayUsername,
        email: user.email,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
        followersCount: sql<number>`COALESCE((${followersCountSq}), 0)::int`,
        followingCount: sql<number>`COALESCE((${followingCountSq}), 0)::int`,
        postCount: sql<number>`COALESCE((${postCountSq}), 0)::int`,
        isFollowingCount: sql<number>`COALESCE((${isFollowingSq}), 0)::int`,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      displayUsername: row.displayUsername,
      email: row.email,
      name: row.name,
      image: row.image,
      createdAt: row.createdAt.toISOString(),
      followersCount: row.followersCount,
      followingCount: row.followingCount,
      postCount: row.postCount,
      isFollowing: row.isFollowingCount > 0,
    };
  }
}
