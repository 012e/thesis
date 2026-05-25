import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";
import { UsersModule } from "@/users/users.module";

import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
