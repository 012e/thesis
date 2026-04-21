import { Module } from "@nestjs/common";
import { PgBossModule } from "@wavezync/nestjs-pgboss";

import { auth } from '@/auth';
import { env } from '@/env';
import { DatabaseModule } from '@/db/database.module';
import { PostsModule } from '@/posts/posts.module';
import { ReactionsModule } from '@/reactions/reactions.module';
import { HealthModule } from '@/health/health.module';
import { ThreadsModule } from '@/threads/threads.module';
import { CommentsModule } from '@/comments/comments.module';
import { UsersModule } from '@/users/users.module';
import { FollowsModule } from '@/follows/follows.module';
import { PollsModule } from '@/polls/polls.module';
import { UploadsModule } from '@/uploads/uploads.module';
import { PlaygroundModule } from '@/playground/playground.module';
import { SeedModule } from '@/seed/seed.module';
import { MessagesModule } from '@/messages/messages.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { ConfigModule } from '@/config/config.module';
import { IdentityMcpModule } from './mcp/identity/identity-mcp.module';
import { PostsMcpModule } from './mcp/posts/posts-mcp.module';
import { InteractionsMcpModule } from './mcp/interactions/interactions-mcp.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthController } from "./auth/auth.controller";

@Module({
  controllers: [AppController, AuthController],
  imports: [
    AuthModule.forRoot({ auth, disableTrustedOriginsCors: true }),
    PgBossModule.forRoot({ connectionString: env.DATABASE_URL }),
    DatabaseModule,
    NotificationsModule,
    PostsModule,
    ReactionsModule,
    HealthModule,
    ThreadsModule,
    CommentsModule,
    UsersModule,
    FollowsModule,
    PollsModule,
    UploadsModule,
    PlaygroundModule,
    SeedModule,
    MessagesModule,
    ConfigModule,
    IdentityMcpModule,
    PostsMcpModule,
    InteractionsMcpModule,
  ],
  providers: [AppService],
})
export class AppModule {}
