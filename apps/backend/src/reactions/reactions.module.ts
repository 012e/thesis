import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";

import { ReactionsController } from "./reactions.controller";
import { ReactionsService } from "./reactions.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
