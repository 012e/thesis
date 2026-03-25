import { Controller } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { authContract } from '@repo/rest-contracts';

import { ReactionsService } from './reactions.service';

@Controller()
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @TsRestHandler(authContract.reactToPost)
  reactToPost(@Session() session: UserSession) {
    return tsRestHandler(authContract.reactToPost, async ({ params, body }) => {
      const reaction = await this.reactionsService.react(
        params.id,
        session.user.id,
        body.type,
      );

      if (!reaction) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: authContract.reactToPost.responses[200].parse(reaction),
      };
    });
  }

  @TsRestHandler(authContract.unreactToPost)
  unreactToPost(@Session() session: UserSession) {
    return tsRestHandler(authContract.unreactToPost, async ({ params }) => {
      const reaction = await this.reactionsService.unreact(
        params.id,
        session.user.id,
      );

      if (!reaction) {
        return { status: 404, body: null };
      }

      return {
        status: 200,
        body: authContract.unreactToPost.responses[200].parse(reaction),
      };
    });
  }

  @TsRestHandler(authContract.getReactionSummary)
  getReactionSummary(@Session() session: UserSession) {
    return tsRestHandler(
      authContract.getReactionSummary,
      async ({ params }) => {
        const summary = await this.reactionsService.getSummary(
          params.id,
          session.user.id,
        );

        if (!summary) {
          return { status: 404, body: null };
        }

        return {
          status: 200,
          body: authContract.getReactionSummary.responses[200].parse(summary),
        };
      },
    );
  }

  @TsRestHandler(authContract.listReactors)
  listReactors() {
    return tsRestHandler(
      authContract.listReactors,
      async ({ params, query }) => {
        const reactors = await this.reactionsService.listReactors(
          params.id,
          query.type,
        );

        if (!reactors) {
          return { status: 404, body: null };
        }

        return {
          status: 200,
          body: authContract.listReactors.responses[200].parse(reactors),
        };
      },
    );
  }
}
