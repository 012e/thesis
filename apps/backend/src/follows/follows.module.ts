import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/db/database.module';

import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FollowsController],
  providers: [FollowsService],
})
export class FollowsModule {}
