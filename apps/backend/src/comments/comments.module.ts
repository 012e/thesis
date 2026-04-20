import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/db/database.module';
import { UsersModule } from '@/users/users.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [DatabaseModule, UsersModule, NotificationsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
