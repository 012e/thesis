import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";
import { UsersModule } from "@/users/users.module";
import { NotificationsModule } from "@/notifications/notifications.module";

import { FollowsController } from "./follows.controller";
import { FollowsService } from "./follows.service";

@Module({
  imports: [DatabaseModule, UsersModule, NotificationsModule],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
