import { Controller } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { authContract } from '@repo/rest-contracts';
import { CommentsService } from './comments.service';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @TsRestHandler(authContract.listComments)
  listComments(@Session() session: UserSession) {
    return tsRestHandler(authContract.listComments, async ({ params }) => {
      const comments = await this.commentsService.list(params.postId);
      return {
        status: 200,
        body: authContract.listComments.responses[200].parse(comments),
      };
    });
  }

  @TsRestHandler(authContract.createComment)
  createComment(@Session() session: UserSession) {
    return tsRestHandler(
      authContract.createComment,
      async ({ params, body }) => {
        const comment = await this.commentsService.create(
          session.user.id,
          params.postId,
          body.content,
          body.parentId,
        );
        return {
          status: 201,
          body: authContract.createComment.responses[201].parse(comment),
        };
      },
    );
  }

  @TsRestHandler(authContract.deleteComment)
  deleteComment(@Session() session: UserSession) {
    return tsRestHandler(authContract.deleteComment, async ({ params }) => {
      const existingComment = await this.commentsService.getById(params.id);

      if (!existingComment) {
        return {
          status: 404,
          body: null,
        };
      }

      if (existingComment.authorId !== session.user.id) {
        return {
          status: 403,
          body: null,
        };
      }

      await this.commentsService.delete(params.id);

      return {
        status: 200,
        body: existingComment,
      };
    });
  }

  @TsRestHandler(authContract.getComment)
  getComment(@Session() session: UserSession) {
    return tsRestHandler(authContract.getComment, async ({ params }) => {
      const comment = await this.commentsService.getById(params.id);

      if (!comment) {
        return {
          status: 404,
          body: null,
        };
      }

      return {
        status: 200,
        body: authContract.getComment.responses[200].parse(comment),
      };
    });
  }

  @TsRestHandler(authContract.listCommentReplies)
  listCommentReplies(@Session() session: UserSession) {
    return tsRestHandler(
      authContract.listCommentReplies,
      async ({ params }) => {
        const parent = await this.commentsService.getById(params.id);
        if (!parent) {
          return {
            status: 404,
            body: null,
          };
        }

        const replies = await this.commentsService.listReplies(params.id);
        return {
          status: 200,
          body: authContract.listCommentReplies.responses[200].parse(replies),
        };
      },
    );
  }

  @TsRestHandler(authContract.createReply)
  createReply(@Session() session: UserSession) {
    return tsRestHandler(authContract.createReply, async ({ params, body }) => {
      const parent = await this.commentsService.getById(params.id);
      if (!parent) {
        return {
          status: 404,
          body: null,
        };
      }

      const comment = await this.commentsService.create(
        session.user.id,
        parent.postId,
        body.content,
        params.id,
      );

      return {
        status: 201,
        body: authContract.createReply.responses[201].parse(comment),
      };
    });
  }
}
