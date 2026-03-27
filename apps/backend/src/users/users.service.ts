import { Injectable } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '@/db/database.service';
import { user } from '@/db/auth-schema';
import { userFollows, posts } from '@/db/schema';
import type { UserProfileDto } from '@repo/shared-dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

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
