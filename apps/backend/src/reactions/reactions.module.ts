import { Module } from "@nestjs/common";

import { DatabaseModule } from "@/db/database.module";
import { NotificationsModule } from "@/notifications/notifications.module";
import { PostsModule } from "@/posts/posts.module";
import { XpModule } from "@/xp/xp.module";

import { ReactionsController } from "./reactions.controller";
import { ReactionsService } from "./reactions.service";

@Module({
  imports: [DatabaseModule, NotificationsModule, PostsModule, XpModule],
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
