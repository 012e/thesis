import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/db/database.module';
import { StorageModule } from '@/storage';

import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
