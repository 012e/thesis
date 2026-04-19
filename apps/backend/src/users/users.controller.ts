import { Controller } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { usersContract } from '@repo/rest-contracts';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @TsRestHandler(usersContract.searchUsers)
  searchUsers(@Session() _session: UserSession) {
    return tsRestHandler(usersContract.searchUsers, async ({ query }) => {
      const results = await this.usersService.search(query.q);
      return {
        status: 200,
        body: usersContract.searchUsers.responses[200].parse(results),
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
