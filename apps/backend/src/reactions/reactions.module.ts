import { Module } from "@nestjs/common";

import { DatabaseModule } from '@/db/database.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { PostsModule } from '@/posts/posts.module';

import { ReactionsController } from "./reactions.controller";
import { ReactionsService } from "./reactions.service";

@Module({
  imports: [DatabaseModule, NotificationsModule, PostsModule],
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
