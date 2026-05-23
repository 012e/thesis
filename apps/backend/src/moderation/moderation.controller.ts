import { Controller, Logger } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";

import { moderationContract } from "@repo/rest-contracts";

import { ModerationService } from "./moderation.service";
import { ModerationPipelineService } from "./moderation-pipeline.service";

@Controller()
export class ModerationController {
  private readonly logger = new Logger(ModerationController.name);

  constructor(
    private readonly moderationService: ModerationService,
    private readonly pipelineService: ModerationPipelineService,
  ) {}

  @TsRestHandler(moderationContract.listModerations)
  listModerations(@Session() session: UserSession) {
    return tsRestHandler(
      moderationContract.listModerations,
      async ({ query }) => {
        // Admin check — Better Auth stores role in session
        if ((session.user as any).role !== "admin") {
          return { status: 403, body: null };
        }

        const result = await this.moderationService.listModerationRecords({
          status: query.status,
          source: query.source,
          priority: query.priority,
          page: query.page,
          pageSize: query.pageSize,
        });

        return { status: 200, body: result as any };
      },
    );
  }

  @TsRestHandler(moderationContract.getModeration)
  getModeration(@Session() session: UserSession) {
    return tsRestHandler(
      moderationContract.getModeration,
      async ({ params }) => {
        if ((session.user as any).role !== "admin") {
          return { status: 403, body: null };
        }

        const record = await this.moderationService.getModerationRecord(
          params.id,
        );

        if (!record) {
          return { status: 404, body: null };
        }

        return { status: 200, body: record as any };
      },
    );
  }

  @TsRestHandler(moderationContract.reviewModeration)
  reviewModeration(@Session() session: UserSession) {
    return tsRestHandler(
      moderationContract.reviewModeration,
      async ({ params, body }) => {
        if ((session.user as any).role !== "admin") {
          return { status: 403, body: null };
        }

        const record = await this.moderationService.reviewModeration(
          params.id,
          session.user.id,
          body.status,
          body.reviewNote,
        );

        if (!record) {
          return { status: 404, body: null };
        }

        return { status: 200, body: record as any };
      },
    );
  }

  @TsRestHandler(moderationContract.flagPost)
  flagPost(@Session() session: UserSession) {
    return tsRestHandler(moderationContract.flagPost, async ({ body }) => {
      if ((session.user as any).role !== "admin") {
        return { status: 403, body: null };
      }

      const postExists = await this.moderationService.postExists(body.postId);
      if (!postExists) {
        return { status: 404, body: null };
      }

      const flag = await this.moderationService.createFlag({
        postId: body.postId,
        flaggedBy: session.user.id,
        priority: body.priority,
        reason: body.reason,
      });

      return { status: 201, body: flag as any };
    });
  }

  @TsRestHandler(moderationContract.listReports)
  listReports(@Session() session: UserSession) {
    return tsRestHandler(moderationContract.listReports, async ({ query }) => {
      if ((session.user as any).role !== "admin") {
        return { status: 403, body: null };
      }

      const result = await this.moderationService.listReports({
        page: query.page,
        pageSize: query.pageSize,
      });

      return { status: 200, body: result as any };
    });
  }

  @TsRestHandler(moderationContract.reportPost)
  reportPost(@Session() session: UserSession) {
    return tsRestHandler(
      moderationContract.reportPost,
      async ({ params, body }) => {
        const postExists = await this.moderationService.postExists(params.id);
        if (!postExists) {
          return { status: 404, body: null };
        }

        const result = await this.pipelineService.processReport(
          params.id,
          session.user.id,
          body.reason,
          body.description ?? null,
        );

        // Fetch the created report to return
        const reports = await this.moderationService.listReports({
          page: 0,
          pageSize: 1,
        });

        const report = reports.items.find(
          (r: any) => r.id === result.reportId,
        );

        return { status: 201, body: report as any };
      },
    );
  }
}
