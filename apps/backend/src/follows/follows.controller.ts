import { Controller } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { authContract } from '@repo/auth-contracts';

import { FollowsService } from './follows.service';

@Controller()
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @TsRestHandler(authContract.followUser)
  followUser(@Session() session: UserSession) {
    return tsRestHandler(authContract.followUser, async ({ params }) => {
      if (params.id === session.user.id) {
        return { status: 400, body: null };
      }

      const follow = await this.followsService.follow(
        session.user.id,
        params.id,
      );
      if (!follow) {
        return { status: 404, body: null };
      }

      return {
        status: 201,
        body: authContract.followUser.responses[201].parse(follow),
      };
    });
  }

  @TsRestHandler(authContract.unfollowUser)
  unfollowUser(@Session() session: UserSession) {
    return tsRestHandler(authContract.unfollowUser, async ({ params }) => {
      const follow = await this.followsService.unfollow(
        session.user.id,
        params.id,
      );

      if (!follow) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: authContract.unfollowUser.responses[200].parse(follow),
      };
    });
  }

  @TsRestHandler(authContract.listFollowers)
  listFollowers() {
    return tsRestHandler(authContract.listFollowers, async ({ params }) => {
      const users = await this.followsService.listFollowers(params.id);

      if (!users) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: authContract.listFollowers.responses[200].parse(users),
      };
    });
  }

  @TsRestHandler(authContract.listFollowing)
  listFollowing() {
    return tsRestHandler(authContract.listFollowing, async ({ params }) => {
      const users = await this.followsService.listFollowing(params.id);

      if (!users) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: authContract.listFollowing.responses[200].parse(users),
      };
    });
  }
}
