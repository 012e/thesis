import { Controller } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { Session } from "@thallesp/nestjs-better-auth";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { threadsContract } from "@repo/rest-contracts";

import { ThreadsService } from "./threads.service";

@Controller()
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @TsRestHandler(threadsContract.listThreads)
  list(@Session() session: UserSession) {
    return tsRestHandler(threadsContract.listThreads, async () => {
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

  @TsRestHandler(threadsContract.createThread)
  create(@Session() session: UserSession) {
    return tsRestHandler(threadsContract.createThread, async ({ body }) => {
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

  @TsRestHandler(threadsContract.getThread)
  get(@Session() session: UserSession) {
    return tsRestHandler(threadsContract.getThread, async ({ params }) => {
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

  @TsRestHandler(threadsContract.updateThreadTitle)
  rename(@Session() session: UserSession) {
    return tsRestHandler(
      threadsContract.updateThreadTitle,
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

  @TsRestHandler(threadsContract.archiveThread)
  archive(@Session() session: UserSession) {
    return tsRestHandler(threadsContract.archiveThread, async ({ params }) => {
      await this.threadsService.archive(params.id, session.user.id);
      return { status: 200, body: { success: true } };
    });
  }

  @TsRestHandler(threadsContract.unarchiveThread)
  unarchive(@Session() session: UserSession) {
    return tsRestHandler(
      threadsContract.unarchiveThread,
      async ({ params }) => {
        await this.threadsService.unarchive(params.id, session.user.id);
        return { status: 200, body: { success: true } };
      },
    );
  }

  @TsRestHandler(threadsContract.deleteThread)
  deleteThread(@Session() session: UserSession) {
    return tsRestHandler(threadsContract.deleteThread, async ({ params }) => {
      await this.threadsService.delete(params.id, session.user.id);
      return { status: 200, body: { success: true } };
    });
  }

  @TsRestHandler(threadsContract.generateThreadTitle)
  generateTitle(@Session() session: UserSession) {
    return tsRestHandler(
      threadsContract.generateThreadTitle,
      async ({ params, body }) => {
        const firstUserMessage = body.messages?.find(
          (
            m,
          ): m is {
            role: string;
            content: string | { type: string; text?: string }[];
          } => {
            return (
              typeof m === "object" &&
              m !== null &&
              "role" in m &&
              (m as { role: unknown }).role === "user"
            );
          },
        );

        let title = "New Chat";
        if (firstUserMessage && "content" in firstUserMessage) {
          const content = firstUserMessage.content;
          if (typeof content === "string") {
            title = content.slice(0, 50);
          } else if (Array.isArray(content)) {
            const textPart = content.find(
              (p): p is { type: string; text: string } =>
                typeof p === "object" &&
                p !== null &&
                "type" in p &&
                (p as { type: unknown }).type === "text" &&
                "text" in p &&
                typeof (p as { text: unknown }).text === "string",
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

  @TsRestHandler(threadsContract.listThreadMessages)
  listMessages(@Session() session: UserSession) {
    return tsRestHandler(
      threadsContract.listThreadMessages,
      async ({ params }) => {
        const messages = await this.threadsService.getMessages(
          params.id,
          session.user.id,
        );
        if (messages === null) {
          return { status: 404, body: null };
        }
        return { status: 200, body: messages };
      },
    );
  }

  @TsRestHandler(threadsContract.appendThreadMessage)
  appendMessage(@Session() session: UserSession) {
    return tsRestHandler(
      threadsContract.appendThreadMessage,
      async ({ params, body }) => {
        const ok = await this.threadsService.appendMessage(
          params.id,
          session.user.id,
          body.entry,
        );
        if (!ok) {
          return { status: 404, body: null };
        }
        return { status: 200, body: { success: true } };
      },
    );
  }
}
