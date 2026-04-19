import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";

import { PollsController } from "./polls.controller";
import { PollsService } from "./polls.service";

@Module({
  imports: [DatabaseModule],
  controllers: [PollsController],
  providers: [PollsService],
  exports: [PollsService],
})
export class PollsModule {}
