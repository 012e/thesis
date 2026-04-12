import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/db/database.module';

import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ThreadsController],
  providers: [ThreadsService],
  exports: [ThreadsService],
})
export class ThreadsModule {}
