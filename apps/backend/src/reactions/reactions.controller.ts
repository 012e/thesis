import { Controller } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { reactionsContract } from '@repo/rest-contracts';

import { ReactionsService } from './reactions.service';

@Controller()
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @TsRestHandler(reactionsContract.reactToPost)
  reactToPost(@Session() session: UserSession) {
    return tsRestHandler(
      reactionsContract.reactToPost,
      async ({ params, body }) => {
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
          body: reactionsContract.reactToPost.responses[200].parse(reaction),
        };
      },
    );
  }

  @TsRestHandler(reactionsContract.unreactToPost)
  unreactToPost(@Session() session: UserSession) {
    return tsRestHandler(
      reactionsContract.unreactToPost,
      async ({ params }) => {
        const reaction = await this.reactionsService.unreact(
          params.id,
          session.user.id,
        );

        if (!reaction) {
          return { status: 404, body: null };
        }

        return {
          status: 200,
          body: reactionsContract.unreactToPost.responses[200].parse(reaction),
        };
      },
    );
  }

  @TsRestHandler(reactionsContract.getReactionSummary)
  getReactionSummary(@Session() session: UserSession) {
    return tsRestHandler(
      reactionsContract.getReactionSummary,
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
          body: reactionsContract.getReactionSummary.responses[200].parse(
            summary,
          ),
        };
      },
    );
  }

  @TsRestHandler(reactionsContract.listReactors)
  listReactors() {
    return tsRestHandler(
      reactionsContract.listReactors,
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
          body: reactionsContract.listReactors.responses[200].parse(reactors),
        };
      },
    );
  }
}
