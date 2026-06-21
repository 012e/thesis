import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { UsersModule } from "@/users/users.module";
import { NotificationsModule } from "@/notifications/notifications.module";
import { PostsModule } from "@/posts/posts.module";
import { XpModule } from "@/xp/xp.module";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    NotificationsModule,
    PostsModule,
    XpModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
