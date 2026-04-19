import { and, desc, eq } from "drizzle-orm";
import { Injectable } from "@nestjs/common";
import type { FollowUserDto, UserFollowDto } from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import { userFollows, usersView } from "@/db/schema";
import { UsersService } from "@/users/users.service";

@Injectable()
export class FollowsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersService: UsersService,
  ) {}

  async follow(
    followerId: string,
    followeeId: string,
  ): Promise<UserFollowDto | null> {
    const followeeExists = await this.userExists(followeeId);
    if (!followeeExists) {
      return null;
    }

    await this.databaseService.db
      .insert(userFollows)
      .values({ followerId, followeeId })
      .onConflictDoNothing();

    const [row] = await this.databaseService.db
      .select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followeeId, followeeId),
        ),
      )
      .limit(1);

    return row ? this.toFollowDto(row) : null;
  }

  async unfollow(
    followerId: string,
    followeeId: string,
  ): Promise<UserFollowDto | null> {
    const followeeExists = await this.userExists(followeeId);
    if (!followeeExists) {
      return null;
    }

    const [row] = await this.databaseService.db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followeeId, followeeId),
        ),
      )
      .returning();

    return row ? this.toFollowDto(row) : null;
  }

  async listFollowers(userId: string): Promise<FollowUserDto[] | null> {
    const userExists = await this.userExists(userId);
    if (!userExists) {
      return null;
    }

    const rows = await this.databaseService.db
      .select({
        id: usersView.id,
        username: usersView.username,
        email: usersView.email,
        name: usersView.name,
        image: usersView.image,
      })
      .from(userFollows)
      .innerJoin(usersView, eq(userFollows.followerId, usersView.id))
      .where(eq(userFollows.followeeId, userId))
      .orderBy(desc(userFollows.createdAt));

    return rows.map((row) => ({
      id: row.id,
      username: row.username ?? null,
      email: row.email,
      name: row.name ?? null,
      image: this.usersService.resolveAvatarUrl(row.image ?? null),
    }));
  }

  async listFollowing(userId: string): Promise<FollowUserDto[] | null> {
    const userExists = await this.userExists(userId);
    if (!userExists) {
      return null;
    }

    const rows = await this.databaseService.db
      .select({
        id: usersView.id,
        username: usersView.username,
        email: usersView.email,
        name: usersView.name,
        image: usersView.image,
      })
      .from(userFollows)
      .innerJoin(usersView, eq(userFollows.followeeId, usersView.id))
      .where(eq(userFollows.followerId, userId))
      .orderBy(desc(userFollows.createdAt));

    return rows.map((row) => ({
      id: row.id,
      username: row.username ?? null,
      email: row.email,
      name: row.name ?? null,
      image: this.usersService.resolveAvatarUrl(row.image ?? null),
    }));
  }

  private async userExists(userId: string): Promise<boolean> {
    const [row] = await this.databaseService.db
      .select({ id: usersView.id })
      .from(usersView)
      .where(eq(usersView.id, userId))
      .limit(1);

    return !!row;
  }

  private readonly toFollowDto = (
    row: typeof userFollows.$inferSelect,
  ): UserFollowDto => ({
    followerId: row.followerId,
    followeeId: row.followeeId,
    createdAt: row.createdAt.toISOString(),
  });
}
