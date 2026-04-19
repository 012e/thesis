import {
  Controller,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { messagesContract } from '@repo/rest-contracts';

import { MessagesService } from './messages.service';

@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @TsRestHandler(messagesContract.listConversations)
  listConversations(@Session() session: UserSession) {
    return tsRestHandler(messagesContract.listConversations, async () => {
      const result = await this.messagesService.listConversations(
        session.user.id,
      );
      return { status: 200, body: result };
    });
  }

  @TsRestHandler(messagesContract.startConversation)
  startConversation(@Session() session: UserSession) {
    return tsRestHandler(
      messagesContract.startConversation,
      async ({ body }) => {
        try {
          const { conversation, created } =
            await this.messagesService.findOrCreateConversation(
              session.user.id,
              body.recipientId,
            );
          return { status: created ? 201 : 200, body: conversation };
        } catch (err) {
          if (err instanceof ForbiddenException) {
            return { status: 400, body: null };
          }
          if (err instanceof NotFoundException) {
            return { status: 404, body: null };
          }
          throw err;
        }
      },
    );
  }

  // Registered before getConversation so the literal path segment "unread-count"
  // takes precedence over the :id parameter at the NestJS routing layer.
  @TsRestHandler(messagesContract.getUnreadCount)
  getUnreadCount(@Session() session: UserSession) {
    return tsRestHandler(messagesContract.getUnreadCount, async () => {
      const total = await this.messagesService.getTotalUnreadCount(
        session.user.id,
      );
      return { status: 200, body: { total } };
    });
  }

  @TsRestHandler(messagesContract.getConversation)
  getConversation(@Session() session: UserSession) {
    return tsRestHandler(
      messagesContract.getConversation,
      async ({ params }) => {
        try {
          const conversation = await this.messagesService.getConversation(
            params.id,
            session.user.id,
          );
          return { status: 200, body: conversation };
        } catch (err) {
          if (err instanceof ForbiddenException) {
            return { status: 403, body: null };
          }
          if (err instanceof NotFoundException) {
            return { status: 404, body: null };
          }
          throw err;
        }
      },
    );
  }

  @TsRestHandler(messagesContract.listMessages)
  listMessages(@Session() session: UserSession) {
    return tsRestHandler(
      messagesContract.listMessages,
      async ({ params, query }) => {
        try {
          const result = await this.messagesService.listMessages(
            params.id,
            session.user.id,
            query.before,
            query.limit,
          );
          return { status: 200, body: result };
        } catch (err) {
          if (err instanceof ForbiddenException) {
            return { status: 403, body: null };
          }
          if (err instanceof NotFoundException) {
            return { status: 404, body: null };
          }
          throw err;
        }
      },
    );
  }

  @TsRestHandler(messagesContract.sendMessage)
  sendMessage(@Session() session: UserSession) {
    return tsRestHandler(
      messagesContract.sendMessage,
      async ({ params, body }) => {
        try {
          const message = await this.messagesService.sendMessage(
            params.id,
            session.user.id,
            body.content,
          );
          return { status: 201, body: message };
        } catch (err) {
          if (err instanceof ForbiddenException) {
            return { status: 403, body: null };
          }
          if (err instanceof NotFoundException) {
            return { status: 404, body: null };
          }
          throw err;
        }
      },
    );
  }

  @TsRestHandler(messagesContract.markConversationRead)
  markConversationRead(@Session() session: UserSession) {
    return tsRestHandler(
      messagesContract.markConversationRead,
      async ({ params }) => {
        try {
          await this.messagesService.markConversationRead(
            params.id,
            session.user.id,
          );
          return { status: 200, body: null };
        } catch (err) {
          if (err instanceof ForbiddenException) {
            return { status: 403, body: null };
          }
          if (err instanceof NotFoundException) {
            return { status: 404, body: null };
          }
          throw err;
        }
      },
    );
  }
}
