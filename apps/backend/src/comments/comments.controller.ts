import { Controller } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { commentsContract } from "@repo/rest-contracts";
import { CommentsService } from "./comments.service";

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @TsRestHandler(commentsContract.listComments)
  listComments(@Session() session: UserSession) {
    return tsRestHandler(commentsContract.listComments, async ({ params }) => {
      const comments = await this.commentsService.list(
        params.postId,
        session?.user?.id,
      );
      return {
        status: 200,
        body: commentsContract.listComments.responses[200].parse(comments),
      };
    });
  }

  @TsRestHandler(commentsContract.createComment)
  createComment(@Session() session: UserSession) {
    return tsRestHandler(
      commentsContract.createComment,
      async ({ params, body }) => {
        const comment = await this.commentsService.create(
          session.user.id,
          params.postId,
          body.content,
          body.parentId,
        );
        return {
          status: 201,
          body: commentsContract.createComment.responses[201].parse(comment),
        };
      },
    );
  }

  @TsRestHandler(commentsContract.deleteComment)
  deleteComment(@Session() session: UserSession) {
    return tsRestHandler(commentsContract.deleteComment, async ({ params }) => {
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

  @TsRestHandler(commentsContract.getComment)
  getComment(@Session() session: UserSession) {
    return tsRestHandler(commentsContract.getComment, async ({ params }) => {
      const comment = await this.commentsService.getById(
        params.id,
        session?.user?.id,
      );

      if (!comment) {
        return {
          status: 404,
          body: null,
        };
      }

      return {
        status: 200,
        body: commentsContract.getComment.responses[200].parse(comment),
      };
    });
  }

  @TsRestHandler(commentsContract.listCommentReplies)
  listCommentReplies(@Session() session: UserSession) {
    return tsRestHandler(
      commentsContract.listCommentReplies,
      async ({ params }) => {
        const parent = await this.commentsService.getById(params.id);
        if (!parent) {
          return {
            status: 404,
            body: null,
          };
        }

        const replies = await this.commentsService.listReplies(
          params.id,
          session?.user?.id,
        );
        return {
          status: 200,
          body: commentsContract.listCommentReplies.responses[200].parse(
            replies,
          ),
        };
      },
    );
  }

  @TsRestHandler(commentsContract.createReply)
  createReply(@Session() session: UserSession) {
    return tsRestHandler(
      commentsContract.createReply,
      async ({ params, body }) => {
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
          body: commentsContract.createReply.responses[201].parse(comment),
        };
      },
    );
  }
}
