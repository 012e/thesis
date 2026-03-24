import { Module } from '@nestjs/common';

import { auth } from '@/auth';
import { DatabaseModule } from '@/db/database.module';
import { PostsModule } from '@/posts/posts.module';
import { ReactionsModule } from '@/reactions/reactions.module';
import { HealthModule } from '@/health/health.module';
import { ThreadsModule } from '@/threads/threads.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';

@Module({
  controllers: [AppController, AuthController],
  imports: [
    AuthModule.forRoot({ auth, disableTrustedOriginsCors: true }),
    DatabaseModule,
    PostsModule,
    ReactionsModule,
    HealthModule,
    ThreadsModule,
  ],
  providers: [AppService],
})
export class AppModule {}
