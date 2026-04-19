import { Controller } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";

import { followsContract } from "@repo/rest-contracts";

import { FollowsService } from "./follows.service";

@Controller()
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @TsRestHandler(followsContract.followUser)
  followUser(@Session() session: UserSession) {
    return tsRestHandler(followsContract.followUser, async ({ params }) => {
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
        body: followsContract.followUser.responses[201].parse(follow),
      };
    });
  }

  @TsRestHandler(followsContract.unfollowUser)
  unfollowUser(@Session() session: UserSession) {
    return tsRestHandler(followsContract.unfollowUser, async ({ params }) => {
      const follow = await this.followsService.unfollow(
        session.user.id,
        params.id,
      );

      if (!follow) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: followsContract.unfollowUser.responses[200].parse(follow),
      };
    });
  }

  @TsRestHandler(followsContract.listFollowers)
  listFollowers() {
    return tsRestHandler(followsContract.listFollowers, async ({ params }) => {
      const users = await this.followsService.listFollowers(params.id);

      if (!users) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: followsContract.listFollowers.responses[200].parse(users),
      };
    });
  }

  @TsRestHandler(followsContract.listFollowing)
  listFollowing() {
    return tsRestHandler(followsContract.listFollowing, async ({ params }) => {
      const users = await this.followsService.listFollowing(params.id);

      if (!users) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: followsContract.listFollowing.responses[200].parse(users),
      };
    });
  }
}
