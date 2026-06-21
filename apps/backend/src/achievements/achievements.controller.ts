import { Controller } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";

import { achievementsContract } from "@repo/rest-contracts";

import { AchievementsService } from "./achievements.service";

@Controller()
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @TsRestHandler(achievementsContract.getUserAchievements)
  getUserAchievements() {
    return tsRestHandler(
      achievementsContract.getUserAchievements,
      async ({ params }) => {
        const achievements = await this.achievementsService.list(params.id);

        if (!achievements) {
          return { status: 404, body: null };
        }

        return {
          status: 200,
          body: achievementsContract.getUserAchievements.responses[200].parse({
            achievements,
          }),
        };
      },
    );
  }
}
