import { Controller } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { pollsContract } from '@repo/rest-contracts';

import { PollsService } from './polls.service';
import { votePollSchema } from './polls.schemas';

@Controller()
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @TsRestHandler(pollsContract.votePoll)
  votePoll(@Session() session: UserSession) {
    return tsRestHandler(pollsContract.votePoll, async ({ params, body }) => {
      const input = votePollSchema.parse(body);
      const result = await this.pollsService.vote(
        params.id,
        session.user.id,
        input,
      );

      if ('error' in result) {
        if (result.code === 'NOT_FOUND') {
          return {
            status: 404,
            body: { message: result.error },
          };
        }
        return {
          status: 400,
          body: { message: result.error },
        };
      }

      return {
        status: 200,
        body: result,
      };
    });
  }

  @TsRestHandler(pollsContract.unvotePoll)
  unvotePoll(@Session() session: UserSession) {
    return tsRestHandler(pollsContract.unvotePoll, async ({ params }) => {
      const result = await this.pollsService.unvote(params.id, session.user.id);

      if ('error' in result) {
        return {
          status: 404,
          body: { message: result.error },
        };
      }

      return {
        status: 200,
        body: result,
      };
    });
  }

  @TsRestHandler(pollsContract.getPollResults)
  getPollResults(@Session() session: UserSession) {
    return tsRestHandler(pollsContract.getPollResults, async ({ params }) => {
      const result = await this.pollsService.getResults(
        params.id,
        session.user.id,
      );

      if ('error' in result) {
        return {
          status: 404,
          body: { message: result.error },
        };
      }

      return {
        status: 200,
        body: result,
      };
    });
  }
}
