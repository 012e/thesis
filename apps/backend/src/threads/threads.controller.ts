import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { authContract } from '@repo/auth-contracts';

import { ThreadsService } from './threads.service';

@Controller()
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @TsRestHandler(authContract.listThreads)
  list(@Session() session: UserSession) {
    return tsRestHandler(authContract.listThreads, async () => {
      const threads = await this.threadsService.list(session.user.id);
      return {
        status: 200,
        body: threads.map((thread) => ({
          id: thread.id,
          externalId: thread.externalId,
          isArchived: thread.isArchived,
          title: thread.title,
          createdAt: thread.createdAt.toISOString(),
          updatedAt: thread.updatedAt.toISOString(),
        })),
      };
    });
  }

  @TsRestHandler(authContract.createThread)
  create(@Session() session: UserSession) {
    return tsRestHandler(authContract.createThread, async ({ body }) => {
      const thread = await this.threadsService.create(
        session.user.id,
        body.localId,
      );
      return {
        status: 201,
        body: {
          id: thread.id,
          externalId: thread.externalId,
          isArchived: thread.isArchived,
          title: thread.title,
          createdAt: thread.createdAt.toISOString(),
          updatedAt: thread.updatedAt.toISOString(),
        },
      };
    });
  }

  @TsRestHandler(authContract.getThread)
  get(@Session() session: UserSession) {
    return tsRestHandler(authContract.getThread, async ({ params }) => {
      const thread = await this.threadsService.getById(
        params.id,
        session.user.id,
      );
      if (!thread) {
        return { status: 404, body: null };
      }
      return {
        status: 200,
        body: {
          id: thread.id,
          externalId: thread.externalId,
          isArchived: thread.isArchived,
          title: thread.title,
          createdAt: thread.createdAt.toISOString(),
          updatedAt: thread.updatedAt.toISOString(),
        },
      };
    });
  }

  @TsRestHandler(authContract.updateThreadTitle)
  rename(@Session() session: UserSession) {
    return tsRestHandler(
      authContract.updateThreadTitle,
      async ({ params, body }) => {
        await this.threadsService.updateTitle(
          params.id,
          session.user.id,
          body.title,
        );
        return { status: 200, body: { success: true } };
      },
    );
  }

  @TsRestHandler(authContract.archiveThread)
  archive(@Session() session: UserSession) {
    return tsRestHandler(authContract.archiveThread, async ({ params }) => {
      await this.threadsService.archive(params.id, session.user.id);
      return { status: 200, body: { success: true } };
    });
  }

  @TsRestHandler(authContract.unarchiveThread)
  unarchive(@Session() session: UserSession) {
    return tsRestHandler(authContract.unarchiveThread, async ({ params }) => {
      await this.threadsService.unarchive(params.id, session.user.id);
      return { status: 200, body: { success: true } };
    });
  }

  @TsRestHandler(authContract.deleteThread)
  deleteThread(@Session() session: UserSession) {
    return tsRestHandler(authContract.deleteThread, async ({ params }) => {
      await this.threadsService.delete(params.id, session.user.id);
      return { status: 200, body: { success: true } };
    });
  }

  @TsRestHandler(authContract.generateThreadTitle)
  generateTitle(@Session() session: UserSession) {
    return tsRestHandler(
      authContract.generateThreadTitle,
      async ({ params, body }) => {
        const firstUserMessage = body.messages?.find(
          (
            m,
          ): m is {
            role: string;
            content: string | { type: string; text?: string }[];
          } => {
            return (
              typeof m === 'object' &&
              m !== null &&
              'role' in m &&
              (m as { role: unknown }).role === 'user'
            );
          },
        );

        let title = 'New Chat';
        if (firstUserMessage && 'content' in firstUserMessage) {
          const content = firstUserMessage.content;
          if (typeof content === 'string') {
            title = content.slice(0, 50);
          } else if (Array.isArray(content)) {
            const textPart = content.find(
              (p): p is { type: string; text: string } =>
                typeof p === 'object' &&
                p !== null &&
                'type' in p &&
                (p as { type: unknown }).type === 'text' &&
                'text' in p &&
                typeof (p as { text: unknown }).text === 'string',
            );
            if (textPart) {
              title = textPart.text.slice(0, 50);
            }
          }
        }

        await this.threadsService.updateTitle(
          params.id,
          session.user.id,
          title,
        );

        return { status: 200, body: { title } };
      },
    );
  }
}
