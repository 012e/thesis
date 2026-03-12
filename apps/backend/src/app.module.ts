import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { auth, setRabbitMQService } from '@/auth';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { RabbitMQModule, RabbitMQService } from '@/events';

@Module({
  controllers: [AppController, AuthController],
  imports: [
    AuthModule.forRoot({ auth, disableTrustedOriginsCors: true }),
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
