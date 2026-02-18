import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { auth, setKafkaService } from '@/auth';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { KafkaModule, KafkaService } from '@/events';

@Module({
  controllers: [AppController, AuthController],
  imports: [
    AuthModule.forRoot({ auth, disableTrustedOriginsCors: true }),
    KafkaModule,
  ],
  providers: [AppService],
})
export class AppModule {
  constructor(private readonly kafkaService: KafkaService) {
    // Inject KafkaService into Better Auth hooks
    setKafkaService(kafkaService);
  }
}
