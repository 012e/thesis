import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";
import { NotificationsModule } from "@/notifications/notifications.module";

import { AchievementsController } from "./achievements.controller";
import { AchievementsService } from "./achievements.service";

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
