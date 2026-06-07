import { Controller } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";

import { analyticsContract } from "@repo/rest-contracts";

import { AnalyticsService } from "./analytics.service";

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @TsRestHandler(analyticsContract.ingestEvents)
  ingestEvents(@Session() session: UserSession) {
    return tsRestHandler(analyticsContract.ingestEvents, async ({ body }) => {
      const ingested = await this.analyticsService.ingestBatch(
        body.events.map((e) => ({
          userId: session.user.id,
          type: e.type,
          metadata: e.metadata ?? null,
          clientTimestamp: new Date(e.timestamp),
        })),
      );

      return {
        status: 201 as const,
        body: analyticsContract.ingestEvents.responses[201].parse({
          ingested,
        }),
      };
    });
  }

  @TsRestHandler(analyticsContract.getMyEvents)
  getMyEvents(@Session() session: UserSession) {
    return tsRestHandler(analyticsContract.getMyEvents, async ({ query }) => {
      const result = await this.analyticsService.getEventsByUser(
        session.user.id,
        {
          limit: query.limit,
          offset: query.offset,
          type: query.type,
          importantOnly: query.importantOnly,
        },
      );

      return {
        status: 200 as const,
        body: analyticsContract.getMyEvents.responses[200].parse(result),
      };
    });
  }
}
