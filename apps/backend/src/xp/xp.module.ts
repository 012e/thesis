import { Module } from "@nestjs/common";

import { AchievementsModule } from "@/achievements/achievements.module";
import { DatabaseModule } from "@/db/database.module";

import { XpService } from "./xp.service";

@Module({
  imports: [DatabaseModule, AchievementsModule],
  providers: [XpService],
  exports: [XpService],
})
export class XpModule {}
