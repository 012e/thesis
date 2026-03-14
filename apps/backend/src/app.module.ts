import { Module } from '@nestjs/common';

import { auth, setRabbitMQService } from '@/auth';
import { DatabaseModule } from '@/db/database.module';
import { RabbitMQModule, RabbitMQService } from '@/events';
import { PostsModule } from '@/posts/posts.module';
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
    RabbitMQModule,
  ],
  providers: [AppService],
})
export class AppModule {
  constructor(private readonly rabbitmqService: RabbitMQService) {
    // Inject RabbitMQService into Better Auth hooks
    setRabbitMQService(rabbitmqService);
  }
}
