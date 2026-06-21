import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";

import { XpService } from "./xp.service";

@Module({
  imports: [DatabaseModule],
  providers: [XpService],
  exports: [XpService],
})
export class XpModule {}
