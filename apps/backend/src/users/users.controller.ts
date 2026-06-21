import { Controller } from "@nestjs/common";
import { Session } from "@thallesp/nestjs-better-auth";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { usersContract } from "@repo/rest-contracts";
import { UsersService } from "./users.service";

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @TsRestHandler(usersContract.searchUsers)
  searchUsers(@Session() _session: UserSession) {
    return tsRestHandler(usersContract.searchUsers, async ({ query }) => {
      const results = await this.usersService.search(
        query.q,
        query.limit,
        query.offset,
      );
      return {
        status: 200,
        body: usersContract.searchUsers.responses[200].parse(results),
      };
    });
  }

  @TsRestHandler(usersContract.getLeaderboard)
  getLeaderboard(@Session() _session: UserSession) {
    return tsRestHandler(usersContract.getLeaderboard, async ({ query }) => {
      const results = await this.usersService.getLeaderboard(
        query.limit,
        query.offset,
      );
      return {
        status: 200,
        body: usersContract.getLeaderboard.responses[200].parse(results),
      };
    });
  }

  @TsRestHandler(usersContract.updateAvatar)
  updateAvatar(@Session() session: UserSession) {
    return tsRestHandler(usersContract.updateAvatar, async ({ body }) => {
      await this.usersService.updateAvatar(session.user.id, body.avatarUrl);
      return {
        status: 200,
        body: { image: body.avatarUrl },
      };
    });
  }

  @TsRestHandler(usersContract.updateCoverPhoto)
  updateCoverPhoto(@Session() session: UserSession) {
    return tsRestHandler(usersContract.updateCoverPhoto, async ({ body }) => {
      await this.usersService.updateCoverPhoto(
        session.user.id,
        body.coverPhotoUrl,
      );
      return {
        status: 200,
        body: { coverPhoto: body.coverPhotoUrl },
      };
    });
  }

  @TsRestHandler(usersContract.updateProfile)
  updateProfile(@Session() session: UserSession) {
    return tsRestHandler(usersContract.updateProfile, async ({ body }) => {
      await this.usersService.updateProfile(session.user.id, { bio: body.bio });
      const profile = await this.usersService.getProfile(
        session.user.id,
        session.user.id,
      );

      if (!profile) {
        return { status: 401, body: null };
      }

      return {
        status: 200,
        body: usersContract.updateProfile.responses[200].parse(profile),
      };
    });
  }

  @TsRestHandler(usersContract.getUserProfile)
  getUserProfile(@Session() session: UserSession) {
    return tsRestHandler(usersContract.getUserProfile, async ({ params }) => {
      const profile = await this.usersService.getProfile(
        params.id,
        session.user.id,
      );

      if (!profile) {
        return {
          status: 404,
          body: null,
        };
      }

      return {
        status: 200,
        body: usersContract.getUserProfile.responses[200].parse(profile),
      };
    });
  }
}
